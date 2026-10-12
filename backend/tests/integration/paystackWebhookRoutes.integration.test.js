"use strict";

import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { createHmac } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

import paystackWebhookRoutes from "../../src/routes/paystackWebhookRoutes.js";
import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";

const testSecret = "test-only-paystack-webhook-route-secret";
const originalSecret = process.env.PAYSTACK_SECRET_KEY;

let mongoServer;
const app = express();

app.use(
    "/api/webhooks/paystack",
    paystackWebhookRoutes
);

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error"
    });
});

function makeBody({
    reference = "route_test_reference_001",
    transactionId = 910001,
    amount = 125000
} = {}) {
    return Buffer.from(
        JSON.stringify({
            event: "charge.success",
            data: {
                reference,
                id: transactionId,
                amount,
                status: "success",
                currency: "NGN"
            }
        }),
        "utf8"
    );
}

function sign(body, secret = testSecret) {
    return createHmac("sha512", secret)
        .update(body)
        .digest("hex");
}

async function postWebhook(body, signature = sign(body)) {
    return request(app)
        .post("/api/webhooks/paystack")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", signature)
        .send(body.toString("utf8"));
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_paystack_route_test")
    );

    await PaystackWebhookEvent.syncIndexes();
});

beforeEach(async () => {
    process.env.PAYSTACK_SECRET_KEY = testSecret;
    await PaystackWebhookEvent.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }

    if (originalSecret === undefined) {
        delete process.env.PAYSTACK_SECRET_KEY;
    } else {
        process.env.PAYSTACK_SECRET_KEY = originalSecret;
    }
});

test("accepts a valid signed webhook and persists one event", async () => {
    const body = makeBody();
    const response = await postWebhook(body);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.received, true);
    assert.equal(response.body.duplicate, false);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 1);
});

test("returns success for identical delivery without duplicate persistence", async () => {
    const body = makeBody();

    const first = await postWebhook(body);
    const second = await postWebhook(body);

    assert.equal(first.status, 200);
    assert.equal(first.body.duplicate, false);
    assert.equal(second.status, 200);
    assert.equal(second.body.duplicate, true);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 1);
});

test("rejects an invalid signature without persisting an event", async () => {
    const body = makeBody();

    const response = await postWebhook(
        body,
        sign(body, "different-test-secret")
    );

    assert.equal(response.status, 401);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
});

test("rejects a missing signature without persisting an event", async () => {
    const body = makeBody();

    const response = await request(app)
        .post("/api/webhooks/paystack")
        .set("Content-Type", "application/json")
        .send(body.toString("utf8"));

    assert.equal(response.status, 401);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
});

test("returns unavailable when the Paystack secret is missing", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;

    try {
        const body = makeBody();
        const response = await postWebhook(body);

        assert.equal(response.status, 503);
        assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
    } finally {
        process.env.PAYSTACK_SECRET_KEY = testSecret;
    }
});

test("rejects malformed JSON without persisting an event", async () => {
    const body = Buffer.from("{invalid-json", "utf8");

    const response = await postWebhook(body);

    assert.equal(response.status, 400);
    assert.equal(await PaystackWebhookEvent.countDocuments({}), 0);
});
