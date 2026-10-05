"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import "../../src/models/OutboxEvent.js";

import {
    connectRabbitMQ,
    assertRabbitMQTopology,
    closeRabbitMQ,
    getRabbitMQChannel
} from "../../src/services/rabbitmqService.js";

import {
    dispatchOutboxEvent
} from "../../src/services/outboxDispatcher.js";

import {
    recoverExpiredOutboxDispatchLeases
} from "../../src/services/outboxDispatchLeaseService.js";

const OutboxEvent =
    mongoose.model("OutboxEvent");

let mongoServer;
let rabbitmqChannel;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_outbox_dispatcher_test")
    );

    await connectRabbitMQ();
    await assertRabbitMQTopology();

    rabbitmqChannel = getRabbitMQChannel();

    await rabbitmqChannel.purgeQueue(
        "streamflix.video.processing"
    );
});

test.after(async () => {
    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await OutboxEvent.deleteMany({});

    await rabbitmqChannel.purgeQueue(
        "streamflix.video.processing"
    );
});

test("dispatches a pending video processing event", async () => {
    const event = await OutboxEvent.create({
        eventId: "outbox-dispatch-001",
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-001",
        payload: {
            jobId: "job-001",
            type: "video-processing",
            entityType: "movie",
            entityId: "1",
            correlationId: "corr-001",
            metadata: {
                movieId: 1,
                sourceFilename: "movie-001.mp4"
            }
        },
        status: "pending",
        attempts: 0
    });

    const result =
        await dispatchOutboxEvent(
            event.eventId
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
        1
    );

    assert.ok(stored.publishedAt);
    assert.ok(stored.lastAttemptAt);
});

test(
    "concurrent dispatchers cannot both dispatch the same event",
    async () => {
        const eventId = "outbox-concurrent-dispatch-test";

        await OutboxEvent.create({
            eventId,
            eventType: "video.processing.requested",
            aggregateType: "Movie",
            aggregateId: "movie-concurrent-test",
            payload: {
                jobId: "job-concurrent-test",
                movieId: "movie-concurrent-test"
            },
            status: "pending",
            attempts: 0
        });

        let releasePublisher;

        const publisherStarted = new Promise(
            (resolve) => {
                releasePublisher = resolve;
            }
        );

        const delayedPublisher = async () => {
            await publisherStarted;

            return {
                published: true
            };
        };

        const firstDispatch =
            dispatchOutboxEvent(
                eventId,
                {
                    publishJob: delayedPublisher
                }
            );

        await new Promise((resolve) =>
            setTimeout(resolve, 50)
        );

        const secondDispatch =
            dispatchOutboxEvent(
                eventId,
                {
                    publishJob: delayedPublisher
                }
            );

        await assert.rejects(
            secondDispatch,
            (error) => {
                assert.equal(
                    error.code,
                    "OUTBOX_DISPATCH_LEASE_UNAVAILABLE"
                );

                return true;
            }
        );

        releasePublisher();

        const firstResult =
            await firstDispatch;

        assert.equal(
            firstResult.eventId,
            eventId
        );

        assert.equal(
            firstResult.status,
            "published"
        );

        assert.equal(
            firstResult.published,
            true
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId
            });

        assert.ok(storedEvent);

        assert.equal(
            storedEvent.status,
            "published"
        );

        assert.equal(
            storedEvent.attempts,
            1
        );

        assert.ok(
            storedEvent.publishedAt
        );

        assert.equal(
            storedEvent.dispatchLease,
            null
        );
    }
);

test(
    "dispatcher can reclaim an expired lease",
    async () => {
        const eventId =
            "outbox-expired-lease-dispatch-test";

        await OutboxEvent.create({
            eventId,
            eventType:
                "video.processing.requested",
            aggregateType: "Movie",
            aggregateId:
                "movie-expired-lease-test",
            payload: {
                jobId:
                    "job-expired-lease-test",
                movieId:
                    "movie-expired-lease-test"
            },
            status: "pending",
            attempts: 1,
            lastAttemptAt: new Date(
                Date.now() - 60_000
            ),
            dispatchLease: {
                leaseId:
                    "abandoned-lease-id",
                owner: {
                    name:
                        "old-outbox-dispatcher",
                    instanceId:
                        "abandoned-instance"
                },
                acquiredAt: new Date(
                    Date.now() - 120_000
                ),
                expiresAt: new Date(
                    Date.now() - 60_000
                )
            }
        });

        const publisherCalls = [];

        const publisher = async (
            payload
        ) => {
            publisherCalls.push(payload);

            return {
                published: true
            };
        };

        const result =
            await dispatchOutboxEvent(
                eventId,
                {
                    publishJob: publisher
                }
            );

        assert.equal(
            result.eventId,
            eventId
        );

        assert.equal(
            result.status,
            "published"
        );

        assert.equal(
            result.published,
            true
        );

        assert.equal(
            publisherCalls.length,
            1
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId
            }).lean();

        assert.ok(storedEvent);

        assert.equal(
            storedEvent.status,
            "published"
        );

        assert.equal(
            storedEvent.attempts,
            2
        );

        assert.ok(
            storedEvent.publishedAt
        );

        assert.ok(
            storedEvent.lastAttemptAt
        );

        assert.equal(
            storedEvent.dispatchLease,
            null
        );
    }
);

test(
    "recovery sweep clears only expired pending leases",
    async () => {
        const expiredOne =
            "outbox-recovery-expired-001";

        const expiredTwo =
            "outbox-recovery-expired-002";

        const activeLease =
            "outbox-recovery-active-001";

        const publishedEvent =
            "outbox-recovery-published-001";

        const now = new Date();

        await OutboxEvent.create([
            {
                eventId: expiredOne,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-001",
                payload: {
                    jobId:
                        "job-recovery-001"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "expired-lease-001",
                    owner: {
                        name:
                            "old-dispatcher",
                        instanceId:
                            "old-instance-001"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            60_000
                        )
                }
            },
            {
                eventId: expiredTwo,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-002",
                payload: {
                    jobId:
                        "job-recovery-002"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "expired-lease-002",
                    owner: {
                        name:
                            "old-dispatcher",
                        instanceId:
                            "old-instance-002"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            30_000
                        )
                }
            },
            {
                eventId: activeLease,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-003",
                payload: {
                    jobId:
                        "job-recovery-003"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "active-lease-001",
                    owner: {
                        name:
                            "active-dispatcher",
                        instanceId:
                            "active-instance"
                    },
                    acquiredAt: now,
                    expiresAt:
                        new Date(
                            now.getTime() +
                            60_000
                        )
                }
            },
            {
                eventId: publishedEvent,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-004",
                payload: {
                    jobId:
                        "job-recovery-004"
                },
                status: "published",
                dispatchLease: {
                    leaseId:
                        "published-lease",
                    owner: {
                        name:
                            "dispatcher",
                        instanceId:
                            "published-instance"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            60_000
                        )
                }
            }
        ]);

        const recovered =
            await recoverExpiredOutboxDispatchLeases({
                now
            });

        assert.equal(
            recovered.length,
            2
        );

        const expiredOneStored =
            await OutboxEvent.findOne({
                eventId: expiredOne
            }).lean();

        const expiredTwoStored =
            await OutboxEvent.findOne({
                eventId: expiredTwo
            }).lean();

        const activeStored =
            await OutboxEvent.findOne({
                eventId: activeLease
            }).lean();

        const publishedStored =
            await OutboxEvent.findOne({
                eventId: publishedEvent
            }).lean();

        assert.equal(
            expiredOneStored.dispatchLease,
            null
        );

        assert.equal(
            expiredTwoStored.dispatchLease,
            null
        );

        assert.ok(
            activeStored.dispatchLease
        );

        assert.equal(
            activeStored.dispatchLease.leaseId,
            "active-lease-001"
        );

        assert.ok(
            publishedStored.dispatchLease
        );

        assert.equal(
            publishedStored.dispatchLease.leaseId,
            "published-lease"
        );
    }
);

test("published event is not published again", async () => {
    const event = await OutboxEvent.create({
        eventId: "outbox-dispatch-002",
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-002",
        payload: {
            jobId: "job-002",
            type: "video-processing",
            entityType: "movie",
            entityId: "2",
            metadata: {
                movieId: 2,
                sourceFilename: "movie-002.mp4"
            }
        },
        status: "published",
        attempts: 1,
        publishedAt: new Date()
    });

    const result =
        await dispatchOutboxEvent(
            event.eventId
        );

    assert.equal(
        result.alreadyPublished,
        true
    );

    assert.equal(
        result.published,
        false
    );

    const stored =
        await OutboxEvent.findOne({
            eventId: event.eventId
        }).lean();

    assert.equal(
        stored.attempts,
        1
    );
});

test("unsupported event type is marked failed", async () => {
    const event = await OutboxEvent.create({
        eventId: "outbox-dispatch-003",
        eventType: "unsupported.event",
        aggregateType: "job",
        aggregateId: "job-003",
        payload: {
            jobId: "job-003"
        },
        status: "pending",
        attempts: 0
    });

    await assert.rejects(
        () =>
            dispatchOutboxEvent(
                event.eventId
            ),
        {
            message:
                "Unsupported outbox event type: unsupported.event"
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

    assert.equal(
        stored.lastError.code,
        "UNSUPPORTED_OUTBOX_EVENT_TYPE"
    );
});

test("missing outbox event returns not found", async () => {
    await assert.rejects(
        () =>
            dispatchOutboxEvent(
                "missing-outbox-event"
            ),
        {
            message: "Outbox event not found."
        }
    );
});

test("invalid outbox event ID is rejected", async () => {
    await assert.rejects(
        () =>
            dispatchOutboxEvent(""),
        {
            message:
                "Outbox event ID is required."
        }
    );
});
 
