"use strict";

import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

const originalFetch = globalThis.fetch;
const originalPaystackSecret = process.env.PAYSTACK_SECRET_KEY;

const mongoServer = await MongoMemoryReplSet.create({
    replSet: {
        count: 1
    }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_payment_routes_test");
process.env.PAYSTACK_SECRET_KEY = "test-secret-only-not-a-real-key";

const { app } = await import("../../src/server.js");
const { connectDatabase, disconnectDatabase } =
    await import("../../src/config/database.js");
const User = (await import("../../src/models/User.js")).default;
const ProductCatalogue =
    (await import("../../src/models/ProductCatalogue.js")).default;
const PaymentAttempt =
    (await import("../../src/models/PaymentAttempt.js")).default;
const { hashPassword } =
    await import("../../src/services/authService.js");

let user;
let product;
let accessToken;
let providerCallCount = 0;

function newIdempotencyKey() {
    return `payment-route-test-${randomUUID()}`;
}

function mockedPaystackFetch(url, options) {
    providerCallCount += 1;

    const requestBody = JSON.parse(options.body);

    return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
            status: true,
            message: "Authorization URL created",
            data: {
                authorization_url:
                    "https://checkout.paystack.com/test-route-checkout",
                access_code: "test-route-access-code",
                reference: requestBody.reference
            }
        })
    });
}

before(async () => {
    await connectDatabase();

    await User.syncIndexes();
    await ProductCatalogue.syncIndexes();
    await PaymentAttempt.syncIndexes();

    const password = "StrongPassword123!";
    const passwordHash = await hashPassword(password);

    user = await User.create({
        email: "payment-routes-integration@example.com",
        passwordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

  product = await ProductCatalogue.create({
    productCode: "payment-routes-test-rental",
    productType: "rental",
    displayName: "Payment Routes Test Rental",
    movieId: 99101,
    rentalDurationHours: 48,
    priceMinor: 125000,
    currency: "NGN",
    status: "active"
});

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email: user.email,
            password
        });

    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.success, true);

    accessToken = loginResponse.body.data.accessToken;

    globalThis.fetch = mockedPaystackFetch;
});

afterEach(() => {
    providerCallCount = 0;
});

after(async () => {
    globalThis.fetch = originalFetch;

    if (originalPaystackSecret === undefined) {
        delete process.env.PAYSTACK_SECRET_KEY;
    } else {
        process.env.PAYSTACK_SECRET_KEY = originalPaystackSecret;
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await disconnectDatabase();
    }

    await mongoServer.stop();
});

test("POST /api/payments/initialize rejects unauthenticated requests", async () => {
    const response = await request(app)
        .post("/api/payments/initialize")
        .send({
            productId: product._id.toString()
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(providerCallCount, 0);
});

test("POST /api/payments/initialize requires an idempotency key", async () => {
    const response = await request(app)
        .post("/api/payments/initialize")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
            productId: product._id.toString()
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(providerCallCount, 0);
});

test("authenticated customer can initialize checkout using the catalogue price", async () => {
    const idempotencyKey = newIdempotencyKey();

    const response = await request(app)
        .post("/api/payments/initialize")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send({
            productId: product._id.toString(),
            amount: 1,
            currency: "USD",
            email: "attacker@example.com"
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.outcome, "initialized");
    assert.ok(response.body.attemptId);
    assert.ok(response.body.reference);
    assert.equal(
        response.body.authorizationUrl,
        "https://checkout.paystack.com/test-route-checkout"
    );
    assert.equal(providerCallCount, 1);

    const stored = await PaymentAttempt.findOne({
        attemptId: response.body.attemptId
    });

    assert.ok(stored);
    assert.equal(stored.userId.toString(), user._id.toString());
    assert.equal(stored.productId.toString(), product._id.toString());
    assert.equal(stored.priceSnapshot.amountMinor, 125000);
    assert.equal(stored.priceSnapshot.currency, "NGN");
    assert.equal(stored.status, "pending");
});

test("repeating the same request reuses checkout without another provider call", async () => {
    const idempotencyKey = newIdempotencyKey();

    const first = await request(app)
        .post("/api/payments/initialize")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send({
            productId: product._id.toString()
        });

    assert.equal(first.status, 201);

    const second = await request(app)
        .post("/api/payments/initialize")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send({
            productId: product._id.toString()
        });

    assert.equal(second.status, 200);
    assert.equal(second.body.success, true);
    assert.equal(second.body.outcome, "existing_checkout");
    assert.equal(second.body.attemptId, first.body.attemptId);
    assert.equal(second.body.reference, first.body.reference);
    assert.equal(
        second.body.authorizationUrl,
        first.body.authorizationUrl
    );
    assert.equal(providerCallCount, 1);

    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );
});
