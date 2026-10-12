"use strict";

import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";
import {
    ingestPaystackWebhook
} from "../../src/services/paystackWebhookIngestionService.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_webhook_ingestion_test")
    );

    await PaystackWebhookEvent.syncIndexes();
});

beforeEach(async () => {
    await PaystackWebhookEvent.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function makePayload({
    event = "charge.success",
    reference = "sf_test_reference_001",
    transactionId = 900001,
    amount = 125000,
    status = "success"
} = {}) {
    return Buffer.from(
        JSON.stringify({
            event,
            data: {
                reference,
                id: transactionId,
                amount,
                status,
                currency: "NGN"
            }
        }),
        "utf8"
    );
}

test("persists a valid webhook event as received", async () => {
    const result = await ingestPaystackWebhook(makePayload());

    assert.equal(result.outcome, "received");
    assert.equal(result.event.eventType, "charge.success");
    assert.equal(result.event.providerReference, "sf_test_reference_001");
    assert.equal(result.event.providerTransactionId, "900001");
    assert.equal(result.event.status, "received");
    assert.equal(result.event.attempts, 0);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 1);
});

test("identical delivery is deduplicated without another record", async () => {
    const rawBody = makePayload();

    const first = await ingestPaystackWebhook(rawBody);
    const second = await ingestPaystackWebhook(rawBody);

    assert.equal(first.outcome, "received");
    assert.equal(second.outcome, "duplicate");
    assert.equal(second.event._id.toString(), first.event._id.toString());
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 1);
});

test("different payloads with the same transaction ID remain distinct", async () => {
    const first = await ingestPaystackWebhook(
        makePayload({ amount: 125000 })
    );

    const second = await ingestPaystackWebhook(
        makePayload({ amount: 150000 })
    );

    assert.equal(first.outcome, "received");
    assert.equal(second.outcome, "received");
    assert.equal(first.event.providerTransactionId, "900001");
    assert.equal(second.event.providerTransactionId, "900001");
    assert.notEqual(first.event.eventKey, second.event.eventKey);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 2);
});

test("rejects malformed JSON without writing an event", async () => {
    await assert.rejects(
        ingestPaystackWebhook(Buffer.from("{invalid-json", "utf8")),
        error => error.code === "PAYSTACK_WEBHOOK_INVALID_PAYLOAD"
    );

    assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
});

test("rejects invalid payload structures without writing events", async () => {
    const invalidPayloads = [
        Buffer.from("null", "utf8"),
        Buffer.from(JSON.stringify({ event: "charge.success" }), "utf8"),
        Buffer.from(JSON.stringify({ event: "", data: {} }), "utf8"),
        Buffer.from(JSON.stringify({
            event: "charge.success",
            data: []
        }), "utf8")
    ];

    for (const rawBody of invalidPayloads) {
        await assert.rejects(
            ingestPaystackWebhook(rawBody),
            error => error.code === "PAYSTACK_WEBHOOK_INVALID_PAYLOAD"
        );
    }

    assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
});
