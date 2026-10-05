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
    runOutboxDispatchCycle,
    dispatchPendingOutboxEvent
} from "../../src/services/outboxDispatchRunnerService.js";

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

function createOutboxEvent({
    eventId,
    eventType,
    aggregateId = "movie-mongo-id-1",
    payload = {}
}) {
    return new OutboxEvent({
        eventId,
        eventType,
        aggregateType: "movie",
        aggregateId,
        payload,
        status: "pending",
        attempts: 0
    });
}

test(
    "runner dispatches movie.published events through notification orchestration",
    async () => {
        const event =
            createOutboxEvent({
                eventId:
                    "runner-movie-event-1",

                eventType:
                    "movie.published",

                payload: {
                    movieId: "movie-1",
                    movieMongoId:
                        "movie-mongo-id-1",
                    title: "Runner Movie",
                    slug: "runner-movie"
                }
            });

        await event.save();

        const result =
            await runOutboxDispatchCycle();


        assert.equal(
            result.scannedCount,
            1
        );

        assert.equal(
            result.results.length,
            1
        );

        assert.equal(
            result.results[0].success,
            true
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId:
                    "runner-movie-event-1"
            });

        assert.equal(
            storedEvent.status,
            "published"
        );
    }
);

test(
    "runner ignores already published events",
    async () => {
        const event =
            createOutboxEvent({
                eventId:
                    "runner-published-event",

                eventType:
                    "movie.published"
            });

        event.status = "published";
        event.publishedAt = new Date();

        await event.save();

        const result =
            await runOutboxDispatchCycle();

        assert.equal(
            result.scannedCount,
            0
        );
    }
);

test(
    "runner reports unsupported event types without crashing the cycle",
    async () => {
        const event =
            createOutboxEvent({
                eventId:
                    "runner-unsupported-event",

                eventType:
                    "unsupported.event"
            });

        await event.save();

        const result =
            await runOutboxDispatchCycle();

        assert.equal(
            result.scannedCount,
            1
        );

        assert.equal(
            result.results.length,
            1
        );

        assert.equal(
            result.results[0].success,
            false
        );

        assert.equal(
            result.results[0].error.code,
            "UNSUPPORTED_OUTBOX_EVENT_TYPE"
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId:
                    "runner-unsupported-event"
            });

        assert.equal(
            storedEvent.status,
            "pending"
        );
    }
);

test(
    "runner respects the batch size",
    async () => {
        const events =
            Array.from(
                { length: 5 },
                (_, index) =>
                    createOutboxEvent({
                        eventId:
                            `runner-batch-${index}`,

                        eventType:
                            "unsupported.event"
                    })
            );

        await OutboxEvent.insertMany(
            events
        );

        const result =
            await runOutboxDispatchCycle({
                batchSize: 2
            });

        assert.equal(
            result.scannedCount,
            2
        );

        assert.equal(
            result.results.length,
            2
        );
    }
);

test(
    "runner recovers expired leases before dispatching",
    async () => {
        const event =
            createOutboxEvent({
                eventId:
                    "runner-expired-lease",

                eventType:
                    "movie.published",

                payload: {
                    movieId: "movie-expired-1",
                    movieMongoId:
                        "movie-mongo-id-1",
                    title: "Expired Lease Movie",
                    slug: "expired-lease-movie"
                }
            });

        event.dispatchLease = {
            leaseId: "expired-lease",
            owner: {
                name: "old-runner",
                instanceId: "old-instance"
            },
            acquiredAt:
                new Date(
                    Date.now() - 60_000
                ),
            expiresAt:
                new Date(
                    Date.now() - 30_000
                )
        };

        await event.save();

        const result =
            await runOutboxDispatchCycle();


        assert.equal(
            result.recoveredCount,
            1
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId:
                    "runner-expired-lease"
            });

        assert.equal(
            storedEvent.status,
            "published"
        );
    }
);

test(
    "dispatchPendingOutboxEvent rejects invalid events",
    async () => {
        await assert.rejects(
            () =>
                dispatchPendingOutboxEvent(
                    null
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_OUTBOX_EVENT"
                );

                return true;
            }
        );
    }
);





