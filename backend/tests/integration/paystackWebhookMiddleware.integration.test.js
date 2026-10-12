"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createHmac } from "node:crypto";

import {
    requireValidPaystackSignature
} from "../../src/middleware/paystackWebhookMiddleware.js";

const secret = "test-only-paystack-secret";
const originalSecret = process.env.PAYSTACK_SECRET_KEY;

function sign(rawBody, signingSecret = secret) {
    return createHmac("sha512", signingSecret)
        .update(rawBody)
        .digest("hex");
}

function createTestApp() {
    const app = express();

    app.post(
        "/webhook",
        express.raw({ type: "application/json" }),
        requireValidPaystackSignature,
        (req, res) => {
            res.status(200).json({
                success: true,
                receivedBytes: req.body.length
            });
        }
    );

    return app;
}

test.beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = secret;
});

test.after(() => {
    if (originalSecret === undefined) {
        delete process.env.PAYSTACK_SECRET_KEY;
    } else {
        process.env.PAYSTACK_SECRET_KEY = originalSecret;
    }
});

test("accepts a valid signature when the route receives raw bytes", async () => {
    const body = Buffer.from(
        JSON.stringify({ event: "charge.success", data: { reference: "test_ref_1" } })
    );

    const response = await request(createTestApp())
        .post("/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sign(body))
        .send(body.toString("utf8"));

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.receivedBytes, body.length);
});

test("rejects a tampered body", async () => {
    const original = Buffer.from('{"event":"charge.success"}');
    const altered = Buffer.from('{"event":"charge.failed"}');

    const response = await request(createTestApp())
        .post("/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sign(original))
        .send(altered.toString("utf8"));

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid webhook signature.");
});

test("rejects a missing signature", async () => {
    const body = Buffer.from('{"event":"charge.success"}');

    const response = await request(createTestApp())
        .post("/webhook")
        .set("Content-Type", "application/json")
        .send(body);

    assert.equal(response.status, 401);
});

test("rejects the request when the server secret is unavailable", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;

    try {
        const body = Buffer.from('{"event":"charge.success"}');

        const response = await request(createTestApp())
            .post("/webhook")
            .set("Content-Type", "application/json")
            .set("x-paystack-signature", sign(body))
            .send(body);

        assert.equal(response.status, 503);
        assert.equal(
            response.body.message,
            "Webhook verification is unavailable."
        );
    } finally {
        process.env.PAYSTACK_SECRET_KEY = secret;
    }
});

test("rejects a request without a raw Buffer body", async () => {
    const app = express();

    app.post(
        "/webhook",
        express.json(),
        requireValidPaystackSignature,
        (req, res) => res.sendStatus(200)
    );

    const body = { event: "charge.success" };

    const response = await request(app)
        .post("/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sign(JSON.stringify(body)))
        .send(body);

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Invalid webhook request body.");
});
