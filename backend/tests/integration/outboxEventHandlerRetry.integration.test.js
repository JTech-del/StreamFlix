"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import "../../src/models/OutboxEvent.js";

import {
    handleMoviePublishedOutboxEvent
} from "../../src/services/outboxEventHandler.js";

import {
    recoverDueOutboxEvents
} from "../../src/services/outboxRecoveryService.js";

const OutboxEvent =
    mongoose.model("OutboxEvent");

let mongoServer;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(
            "streamflix_outbox_handler_retry_test"
        )
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await OutboxEvent.deleteMany({});
});

function createMoviePublishedEvent(overrides = {}) {
    return {
        eventId:
            "movie-published-handler-retry-001",
        eventType:
            "movie.published",
        aggregateType:
            "Movie",
        aggregateId:
            "movie-handler-retry-001",
        payload: {
            movieId: 101,
            title:
                "Handler Retry Test Movie",
            slug:
                "handler-retry-test-movie"
        },
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        ...overrides
    };
}

test(
    "transient notification orchestration failure schedules a retry",
    async () => {
        const event =
            await OutboxEvent.create(
                createMoviePublishedEvent()
            );

        const error =
            new Error(
                "Temporary notification orchestration failure"
            );

        error.code =
            "NOTIFICATION_TEMPORARY_FAILURE";

        await assert.rejects(
            () =>
                handleMoviePublishedOutboxEvent(
                    event,
                    {
                        createNotificationJobs:
                            async () => {
                                throw error;
                            }
                    }
                ),
            {
                code:
                    "NOTIFICATION_TEMPORARY_FAILURE"
            }
        );

        const stored =
            await OutboxEvent.findOne({
                eventId: event.eventId
            }).lean();

        assert.equal(
            stored.status,
            "failed"
        );

        assert.equal(
            stored.attempts,
            1
        );

        assert.ok(
            stored.nextAttemptAt
        );

        const delay =
            stored.nextAttemptAt.getTime() -
            stored.lastAttemptAt.getTime();

        assert.ok(
            delay >= 900 &&
            delay <= 2000,
            `Expected roughly 1 second retry delay, received ${delay}ms`
        );

        assert.equal(
            stored.lastError.code,
            "NOTIFICATION_TEMPORARY_FAILURE"
        );
    }
);

test(
    "exhausted notification retry budget becomes terminal failed",
    async () => {
        const event =
            await OutboxEvent.create(
                createMoviePublishedEvent({
                    eventId:
                        "movie-published-handler-retry-002",
                    attempts: 2
                })
            );

        const error =
            new Error(
                "Notification orchestration failed"
            );

        error.code =
            "NOTIFICATION_FAILURE";

        await assert.rejects(
            () =>
                handleMoviePublishedOutboxEvent(
                    event,
                    {
                        createNotificationJobs:
                            async () => {
                                throw error;
                            }
                    }
                )
        );

        const stored =
            await OutboxEvent.findOne({
                eventId: event.eventId
            }).lean();

        assert.equal(
            stored.status,
            "failed"
        );

        assert.equal(
            stored.attempts,
            3
        );

        assert.equal(
            stored.nextAttemptAt,
            null
        );
    }
);

test(
    "recovered movie.published event can be processed successfully",
    async () => {
        const event =
            await OutboxEvent.create(
                createMoviePublishedEvent({
                    eventId:
                        "movie-published-handler-retry-003",
                    status: "failed",
                    attempts: 1,
                    lastAttemptAt:
                        new Date(
                            Date.now() - 5000
                        ),
                    nextAttemptAt:
                        new Date(
                            Date.now() - 1000
                        ),
                    lastError: {
                        code:
                            "NOTIFICATION_TEMPORARY_FAILURE",
                        message:
                            "Temporary failure",
                        occurredAt:
                            new Date(
                                Date.now() - 5000
                            )
                    }
                })
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.length,
            1
        );

        let orchestrationCalls = 0;

        const result =
            await handleMoviePublishedOutboxEvent(
                event,
                {
                    createNotificationJobs:
                        async () => {
                            orchestrationCalls += 1;

                            return {
                                created: 1
                            };
                        }
                }
            );

        assert.equal(
            orchestrationCalls,
            1
        );

        assert.equal(
            result.status,
            "published"
        );

        assert.equal(
            result.created,
            1
        );

        const stored =
            await OutboxEvent.findOne({
                eventId: event.eventId
            }).lean();

        assert.equal(
            stored.status,
            "published"
        );

        assert.equal(
            stored.attempts,
            2
        );

        assert.equal(
            stored.nextAttemptAt,
            null
        );

        assert.ok(
            stored.publishedAt
        );
    }
);
