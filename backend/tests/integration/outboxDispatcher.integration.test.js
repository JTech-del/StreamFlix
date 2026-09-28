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
