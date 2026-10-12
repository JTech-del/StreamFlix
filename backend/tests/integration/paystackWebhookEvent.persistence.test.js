"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_paystack_webhook_event_test")
    );

    await PaystackWebhookEvent.syncIndexes();
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await PaystackWebhookEvent.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function makeEvent(overrides = {}) {
    return {
        eventKey: "paystack:charge.success:transaction-1001",
        eventType: "charge.success",
        providerReference: "sf-test-reference-1001",
        providerTransactionId: "1001",
        payload: {
            event: "charge.success",
            data: {
                id: 1001,
                reference: "sf-test-reference-1001",
                status: "success"
            }
        },
        ...overrides
    };
}

test("persists and retrieves a received webhook event", async () => {
    const created = await PaystackWebhookEvent.create(makeEvent());

    const found = await PaystackWebhookEvent.findById(created._id).lean();

    assert.ok(found);
    assert.equal(found.eventKey, "paystack:charge.success:transaction-1001");
    assert.equal(found.eventType, "charge.success");
    assert.equal(found.providerReference, "sf-test-reference-1001");
    assert.equal(found.providerTransactionId, "1001");
    assert.equal(found.status, "received");
    assert.equal(found.attempts, 0);
    assert.equal(found.payload.data.status, "success");
    assert.equal(found.processedAt, null);
});

test("MongoDB enforces unique webhook event keys", async () => {
    const event = makeEvent({
        eventKey: "paystack:charge.success:duplicate-2001"
    });

    await PaystackWebhookEvent.create(event);

    await assert.rejects(
        PaystackWebhookEvent.create({
            ...event,
            payload: {
                event: "charge.success",
                data: { id: 2001, status: "success" }
            }
        }),
        error => error.code === 11000
    );

    assert.equal(
        await PaystackWebhookEvent.countDocuments({
            eventKey: "paystack:charge.success:duplicate-2001"
        }),
        1
    );
});

test("allows different event keys for different event types", async () => {
    await PaystackWebhookEvent.create(
        makeEvent({
            eventKey: "paystack:charge.success:transaction-3001",
            eventType: "charge.success"
        })
    );

    await PaystackWebhookEvent.create(
        makeEvent({
            eventKey: "paystack:subscription.create:transaction-3001",
            eventType: "subscription.create"
        })
    );

    assert.equal(
        await PaystackWebhookEvent.countDocuments({
            eventKey: {
                $in: [
                    "paystack:charge.success:transaction-3001",
                    "paystack:subscription.create:transaction-3001"
                ]
            }
        }),
        2
    );
});

test("rejects unsupported event statuses", async () => {
    await assert.rejects(
        PaystackWebhookEvent.create(
            makeEvent({
                eventKey: "paystack:invalid-status:4001",
                status: "unknown"
            })
        ),
        error => error.name === "ValidationError"
    );
});

test("rejects negative attempt counts", async () => {
    await assert.rejects(
        PaystackWebhookEvent.create(
            makeEvent({
                eventKey: "paystack:negative-attempts:5001",
                attempts: -1
            })
        ),
        error => error.name === "ValidationError"
    );
});
