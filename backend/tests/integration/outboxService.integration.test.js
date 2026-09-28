"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import "../../src/models/OutboxEvent.js";
import {
    createOutboxEvent
} from "../../src/services/outboxService.js";

const OutboxEvent =
    mongoose.model("OutboxEvent");

let mongoServer;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_outbox_test")
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

test("creates a pending outbox event", async () => {
    const event = await createOutboxEvent({
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-001",
        payload: {
            movieId: 1,
            sourceFilename: "movie-001.mp4"
        }
    });

    assert.ok(event.eventId);
    assert.equal(
        event.eventType,
        "video.processing.requested"
    );
    assert.equal(event.aggregateType, "job");
    assert.equal(event.aggregateId, "job-001");
    assert.equal(event.status, "pending");
    assert.equal(event.attempts, 0);

    assert.deepEqual(
        event.payload,
        {
            movieId: 1,
            sourceFilename: "movie-001.mp4"
        }
    );
});

test("persists the outbox event in MongoDB", async () => {
    const event = await createOutboxEvent({
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-002",
        payload: {
            movieId: 2
        }
    });

    const stored = await OutboxEvent.findOne({
        eventId: event.eventId
    }).lean();

    assert.ok(stored);
    assert.equal(stored.status, "pending");
    assert.equal(stored.aggregateId, "job-002");
});

test("generates unique event IDs", async () => {
    const first = await createOutboxEvent({
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-003",
        payload: {
            movieId: 3
        }
    });

    const second = await createOutboxEvent({
        eventType: "video.processing.requested",
        aggregateType: "job",
        aggregateId: "job-004",
        payload: {
            movieId: 4
        }
    });

    assert.notEqual(
        first.eventId,
        second.eventId
    );
});

test("rejects a missing event type", async () => {
    await assert.rejects(
        () =>
            createOutboxEvent({
                aggregateType: "job",
                aggregateId: "job-005",
                payload: {
                    movieId: 5
                }
            }),
        {
            message: "Outbox event type is required."
        }
    );
});

test("rejects a missing aggregate type", async () => {
    await assert.rejects(
        () =>
            createOutboxEvent({
                eventType: "video.processing.requested",
                aggregateId: "job-006",
                payload: {
                    movieId: 6
                }
            }),
        {
            message: "Outbox aggregate type is required."
        }
    );
});

test("rejects a missing aggregate ID", async () => {
    await assert.rejects(
        () =>
            createOutboxEvent({
                eventType: "video.processing.requested",
                aggregateType: "job",
                payload: {
                    movieId: 7
                }
            }),
        {
            message: "Outbox aggregate ID is required."
        }
    );
});

test("rejects a missing payload", async () => {
    await assert.rejects(
        () =>
            createOutboxEvent({
                eventType: "video.processing.requested",
                aggregateType: "job",
                aggregateId: "job-008"
            }),
        {
            message: "Outbox payload is required."
        }
    );
});
