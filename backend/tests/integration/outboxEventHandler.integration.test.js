"use strict";

import assert from "node:assert/strict";
import test, {
    after,
    before,
    beforeEach
} from "node:test";

import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import OutboxEvent from "../../src/models/OutboxEvent.js";
import Job from "../../src/models/Job.js";

import {
    handleMoviePublishedOutboxEvent,
    getOutboxEventHandler
} from "../../src/services/outboxEventHandler.js";

let mongoServer;

before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );
});

beforeEach(async () => {
    await OutboxEvent.deleteMany({});
    await Job.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function createMoviePublishedEvent(
    overrides = {}
) {
    return new OutboxEvent({
        eventId:
            overrides.eventId ??
            "movie-published-event-1",

        eventType:
            overrides.eventType ??
            "movie.published",

        aggregateType:
            overrides.aggregateType ??
            "movie",

        aggregateId:
            overrides.aggregateId ??
            "movie-mongo-id-1",

        payload:
            overrides.payload ?? {
                movieId: "movie-1",
                movieMongoId:
                    "movie-mongo-id-1",
                title: "Test Movie",
                slug: "test-movie"
            },

        status:
            overrides.status ??
            "pending",

        attempts:
            overrides.attempts ?? 0
    });
}

test(
    "movie.published handler creates notification jobs and publishes the Outbox event",
    async () => {
        const event =
            createMoviePublishedEvent();

        await event.save();

        const createNotificationJobs =
            async (leasedEvent) => {
                assert.equal(
                    leasedEvent.eventId,
                    event.eventId
                );

                const job =
                    new Job({
                        jobId:
                            `notification:${leasedEvent.eventId}:user-1`,

                        type: "notification",

                        entityType: "movie",

                        entityId:
                            leasedEvent.aggregateId,

                        status: "queued",

                        attempt: 0,

                        maxAttempts: 3,

                        correlationId:
                            leasedEvent.eventId,

                        metadata: {
                            eventId:
                                leasedEvent.eventId,

                            recipientUserId:
                                "user-1"
                        }
                    });

                await job.save();

                return {
                    eventId:
                        leasedEvent.eventId,

                    totalRecipients: 1,

                    createdCount: 1,

                    existingCount: 0
                };
            };

        const result =
            await handleMoviePublishedOutboxEvent(
                event,
                {
                    createNotificationJobs
                }
            );

        assert.equal(
            result.eventId,
            event.eventId
        );

        assert.equal(
            result.status,
            "published"
        );

        assert.equal(
            result.published,
            true
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            storedEvent.status,
            "published"
        );

        assert.equal(
            storedEvent.attempts,
            1
        );

        assert.equal(
            storedEvent.dispatchLease,
            null
        );

        const jobs =
            await Job.find({
                correlationId:
                    event.eventId
            });

        assert.equal(
            jobs.length,
            1
        );
    }
);

test(
    "published movie event is not processed again",
    async () => {
        const event =
            createMoviePublishedEvent({
                status: "published"
            });

        await event.save();

        let called = false;

        const result =
            await handleMoviePublishedOutboxEvent(
                event,
                {
                    createNotificationJobs:
                        async () => {
                            called = true;

                            return {
                                totalRecipients: 0,
                                createdCount: 0,
                                existingCount: 0
                            };
                        }
                }
            );

        assert.equal(
            called,
            false
        );

        assert.equal(
            result.alreadyPublished,
            true
        );

        assert.equal(
            result.published,
            false
        );
    }
);

test(
    "concurrent movie.published handlers cannot both acquire the Outbox lease",
    async () => {
        const event =
            createMoviePublishedEvent();

        await event.save();

        let executionCount = 0;

        const createNotificationJobs =
            async () => {
                executionCount += 1;

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            100
                        )
                );

                return {
                    totalRecipients: 1,
                    createdCount: 1,
                    existingCount: 0
                };
            };

        const results =
            await Promise.allSettled([
                handleMoviePublishedOutboxEvent(
                    event,
                    {
                        createNotificationJobs
                    }
                ),

                handleMoviePublishedOutboxEvent(
                    event,
                    {
                        createNotificationJobs
                    }
                )
            ]);

        const fulfilled =
            results.filter(
                (result) =>
                    result.status ===
                    "fulfilled"
            );

        const rejected =
            results.filter(
                (result) =>
                    result.status ===
                    "rejected"
            );

        assert.equal(
            fulfilled.length,
            1
        );

        assert.equal(
            rejected.length,
            1
        );

        assert.equal(
            rejected[0].reason.code,
            "OUTBOX_DISPATCH_LEASE_UNAVAILABLE"
        );

        assert.equal(
            executionCount,
            1
        );
    }
);

test(
    "handler failure marks the Outbox event as failed",
    async () => {
        const event =
            createMoviePublishedEvent();

        await event.save();

        const expectedError =
            new Error(
                "Notification orchestration failed."
            );

        expectedError.code =
            "NOTIFICATION_ORCHESTRATION_FAILED";

        await assert.rejects(
            () =>
                handleMoviePublishedOutboxEvent(
                    event,
                    {
                        createNotificationJobs:
                            async () => {
                                throw expectedError;
                            }
                    }
                ),
            (error) => {
                assert.equal(
                    error,
                    expectedError
                );

                return true;
            }
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            storedEvent.status,
            "failed"
        );

        assert.equal(
            storedEvent.attempts,
            1
        );

        assert.equal(
            storedEvent.lastError.code,
            "NOTIFICATION_ORCHESTRATION_FAILED"
        );

        assert.equal(
            storedEvent.dispatchLease,
            null
        );
    }
);

test(
    "unsupported event type is rejected",
    async () => {
        const event =
            createMoviePublishedEvent({
                eventType:
                    "unsupported.event"
            });

        await event.save();

        await assert.rejects(
            () =>
                handleMoviePublishedOutboxEvent(
                    event
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "UNSUPPORTED_OUTBOX_EVENT_TYPE"
                );

                return true;
            }
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            storedEvent.status,
            "pending"
        );
    }
);

test(
    "getOutboxEventHandler resolves movie.published",
    () => {
        const handler =
            getOutboxEventHandler(
                "movie.published"
            );

        assert.equal(
            handler,
            handleMoviePublishedOutboxEvent
        );
    }
);

test(
    "getOutboxEventHandler returns null for unsupported events",
    () => {
        assert.equal(
            getOutboxEventHandler(
                "unsupported.event"
            ),
            null
        );
    }
);
