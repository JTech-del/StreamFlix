"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import "../../src/models/OutboxEvent.js";

import {
    dispatchOutboxEvent
} from "../../src/services/outboxDispatcher.js";

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
            "streamflix_outbox_retry_test"
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

test(
    "transient dispatcher failure schedules a retry",
    async () => {
        const eventId =
            "outbox-retry-schedule-001";

        await OutboxEvent.create({
            eventId,
            eventType:
                "video.processing.requested",
            aggregateType: "Job",
            aggregateId: "job-retry-001",
            payload: {
                jobId: "job-retry-001"
            },
            status: "pending",
            attempts: 0,
            maxAttempts: 3
        });

        const publisherError =
            new Error(
                "Temporary RabbitMQ failure"
            );

        publisherError.code =
            "RABBITMQ_TEMPORARY_FAILURE";

        await assert.rejects(
            () =>
                dispatchOutboxEvent(
                    eventId,
                    {
                        publishJob: async () => {
                            throw publisherError;
                        }
                    }
                ),
            {
                code:
                    "RABBITMQ_TEMPORARY_FAILURE"
            }
        );

        const stored =
            await OutboxEvent.findOne({
                eventId
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
            stored.lastAttemptAt
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
            "RABBITMQ_TEMPORARY_FAILURE"
        );
    }
);

test(
    "retry delay increases with the attempt number",
    async () => {
        const eventId =
            "outbox-retry-backoff-001";

        await OutboxEvent.create({
            eventId,
            eventType:
                "video.processing.requested",
            aggregateType: "Job",
            aggregateId: "job-retry-backoff-001",
            payload: {
                jobId:
                    "job-retry-backoff-001"
            },
            status: "pending",
            attempts: 1,
            maxAttempts: 3
        });

        const error =
            new Error(
                "Temporary publisher failure"
            );

        error.code =
            "TEMPORARY_PUBLISH_FAILURE";

        await assert.rejects(
            () =>
                dispatchOutboxEvent(
                    eventId,
                    {
                        publishJob: async () => {
                            throw error;
                        }
                    }
                )
        );

        const stored =
            await OutboxEvent.findOne({
                eventId
            }).lean();

        assert.equal(
            stored.attempts,
            2
        );

        assert.ok(
            stored.nextAttemptAt
        );

        const delay =
            stored.nextAttemptAt.getTime() -
            stored.lastAttemptAt.getTime();

        assert.ok(
            delay >= 1800 &&
            delay <= 3000,
            `Expected roughly 2 second retry delay, received ${delay}ms`
        );
    }
);

test(
    "exhausted retry budget becomes terminal failed",
    async () => {
        const eventId =
            "outbox-retry-exhausted-001";

        await OutboxEvent.create({
            eventId,
            eventType:
                "video.processing.requested",
            aggregateType: "Job",
            aggregateId:
                "job-retry-exhausted-001",
            payload: {
                jobId:
                    "job-retry-exhausted-001"
            },
            status: "pending",
            attempts: 2,
            maxAttempts: 3
        });

        const error =
            new Error(
                "Permanent publisher failure"
            );

        error.code =
            "PUBLISHER_FAILURE";

        await assert.rejects(
            () =>
                dispatchOutboxEvent(
                    eventId,
                    {
                        publishJob: async () => {
                            throw error;
                        }
                    }
                )
        );

        const stored =
            await OutboxEvent.findOne({
                eventId
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

        assert.equal(
            stored.lastError.code,
            "PUBLISHER_FAILURE"
        );
    }
);

test(
    "terminal dispatcher errors do not schedule retries",
    async () => {
        const eventId =
            "outbox-retry-terminal-001";

        await OutboxEvent.create({
            eventId,
            eventType:
                "unsupported.event",
            aggregateType: "Job",
            aggregateId:
                "job-terminal-001",
            payload: {
                jobId: "job-terminal-001"
            },
            status: "pending",
            attempts: 0,
            maxAttempts: 3
        });

        await assert.rejects(
            () =>
                dispatchOutboxEvent(
                    eventId
                ),
            {
                code:
                    "UNSUPPORTED_OUTBOX_EVENT_TYPE"
            }
        );

        const stored =
            await OutboxEvent.findOne({
                eventId
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
            stored.nextAttemptAt,
            null
        );
    }
);

test(
    "due failed event recovers and can be dispatched again",
    async () => {
        const eventId =
            "outbox-retry-recovery-001";

        await OutboxEvent.create({
            eventId,
            eventType:
                "video.processing.requested",
            aggregateType: "Job",
            aggregateId:
                "job-retry-recovery-001",
            payload: {
                jobId:
                    "job-retry-recovery-001"
            },
            status: "failed",
            attempts: 1,
            maxAttempts: 3,
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
                    "TEMPORARY_PUBLISH_FAILURE",
                message:
                    "Temporary failure",
                occurredAt:
                    new Date(
                        Date.now() - 5000
                    )
            }
        });

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.length,
            1
        );

        assert.equal(
            recovered[0].eventId,
            eventId
        );

        const recoveredEvent =
            await OutboxEvent.findOne({
                eventId
            }).lean();

        assert.equal(
            recoveredEvent.status,
            "pending"
        );

        assert.equal(
            recoveredEvent.nextAttemptAt,
            null
        );

        let publisherCalls = 0;

        const result =
            await dispatchOutboxEvent(
                eventId,
                {
                    publishJob: async () => {
                        publisherCalls += 1;

                        return {
                            published: true
                        };
                    }
                }
            );

        assert.equal(
            publisherCalls,
            1
        );

        assert.equal(
            result.status,
            "published"
        );

        const stored =
            await OutboxEvent.findOne({
                eventId
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
