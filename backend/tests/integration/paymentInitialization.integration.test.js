"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../../src/models/User.js";
import ProductCatalogue from "../../src/models/ProductCatalogue.js";
import PaymentAttempt from "../../src/models/PaymentAttempt.js";
import {
    initializePaymentForUser
} from "../../src/services/paymentInitializationService.js";

let mongoServer;
let user;
let product;

function newKey() {
    return `payment-init-test-${randomUUID()}`;
}

function successfulPaystackFetch() {
    return async (url, options) => {
        const request = JSON.parse(options.body);

        return {
            ok: true,
            status: 200,
            json: async () => ({
                status: true,
                message: "Authorization URL created",
                data: {
                    authorization_url: "https://checkout.paystack.com/test-checkout",
                    access_code: "test-access-code",
                    reference: request.reference
                }
            })
        };
    };
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_initialization_test")
    );

    await User.syncIndexes();
    await ProductCatalogue.syncIndexes();
    await PaymentAttempt.syncIndexes();

    user = await User.create({
        email: "payment-initialization-test@example.com",
        passwordHash: "test-hash-not-used-for-authentication"
    });

  product = await ProductCatalogue.create({
    productCode: "payment-initialization-rental",
    productType: "rental",
    displayName: "Payment Initialization Test Rental",
    movieId: 99001,
    rentalDurationHours: 48,
    priceMinor: 125000,
    currency: "NGN",
    status: "active"
});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await PaymentAttempt.deleteMany({});
        await ProductCatalogue.deleteMany({});
        await User.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test("initializes Paystack using the database email and catalogue price", async () => {
    let callCount = 0;
    let capturedRequest;

    const result = await initializePaymentForUser({
        userId: user._id,
        productId: product._id,
        idempotencyKey: newKey(),
        secretKey: "test-secret-only",
        fetchImpl: async (url, options) => {
            callCount += 1;
            capturedRequest = {
                url,
                options,
                body: JSON.parse(options.body)
            };

            return successfulPaystackFetch()(url, options);
        }
    });

    assert.equal(result.outcome, "initialized");
    assert.equal(callCount, 1);
    assert.equal(
        capturedRequest.url,
        "https://api.paystack.co/transaction/initialize"
    );
    assert.equal(
        capturedRequest.options.headers.Authorization.startsWith("Bearer "),
        true
    );
    assert.equal(
        capturedRequest.body.email,
        "payment-initialization-test@example.com"
    );
    assert.equal(capturedRequest.body.amount, "125000");
    assert.equal(capturedRequest.body.currency, "NGN");
    assert.equal(capturedRequest.body.reference, result.reference);

    const stored = await PaymentAttempt.findOne({
        attemptId: result.attemptId
    });

    assert.equal(stored.status, "pending");
    assert.equal(stored.checkoutUrl, result.authorizationUrl);
    assert.equal(stored.providerReference, result.reference);
});

test("repeating a successful request returns the same checkout without another provider call", async () => {
    let callCount = 0;
    const idempotencyKey = newKey();

    const fetchImpl = async (url, options) => {
        callCount += 1;
        return successfulPaystackFetch()(url, options);
    };

    const first = await initializePaymentForUser({
        userId: user._id,
        productId: product._id,
        idempotencyKey,
        fetchImpl,
        secretKey: "test-secret-only"
    });

    const second = await initializePaymentForUser({
        userId: user._id,
        productId: product._id,
        idempotencyKey,
        fetchImpl,
        secretKey: "test-secret-only"
    });

    assert.equal(first.outcome, "initialized");
    assert.equal(second.outcome, "existing_checkout");
    assert.equal(second.attemptId, first.attemptId);
    assert.equal(second.reference, first.reference);
    assert.equal(second.authorizationUrl, first.authorizationUrl);
    assert.equal(callCount, 1);

    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );
});

test("concurrent requests allow only one Paystack initialization call", async () => {
    let callCount = 0;
    const idempotencyKey = newKey();

    const fetchImpl = async (url, options) => {
        callCount += 1;

        // Keep the winning request in flight briefly so the other request
        // encounters the already-claimed attempt.
        await new Promise(resolve => setTimeout(resolve, 100));

        return successfulPaystackFetch()(url, options);
    };

    const results = await Promise.allSettled([
        initializePaymentForUser({
            userId: user._id,
            productId: product._id,
            idempotencyKey,
            fetchImpl,
            secretKey: "test-secret-only"
        }),
        initializePaymentForUser({
            userId: user._id,
            productId: product._id,
            idempotencyKey,
            fetchImpl,
            secretKey: "test-secret-only"
        })
    ]);

    const fulfilled = results.filter(result => result.status === "fulfilled");
    const rejected = results.filter(result => result.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(callCount, 1);
    assert.equal(
        rejected[0].reason.code,
        "PAYMENT_INITIALIZATION_ALREADY_CLAIMED"
    );

    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );

    const stored = await PaymentAttempt.findOne({ idempotencyKey });
    assert.equal(stored.status, "pending");
    assert.ok(stored.checkoutUrl);
});

test("an uncertain provider result requires reconciliation and cannot be blindly retried", async () => {
    let callCount = 0;
    const idempotencyKey = newKey();

    const fetchImpl = async () => {
        callCount += 1;

        const error = new Error("Simulated network interruption");
        error.code = "PAYSTACK_INITIALIZATION_UNCERTAIN";
        throw error;
    };

    await assert.rejects(
        initializePaymentForUser({
            userId: user._id,
            productId: product._id,
            idempotencyKey,
            fetchImpl,
            secretKey: "test-secret-only"
        }),
        error =>
            error.code === "PAYMENT_INITIALIZATION_RECONCILIATION_REQUIRED" &&
            error.statusCode === 503
    );

    const stored = await PaymentAttempt.findOne({ idempotencyKey });

    assert.equal(stored.status, "reconciliation_required");
    assert.equal(
        stored.lastError.code,
        "PAYSTACK_INITIALIZATION_UNCERTAIN"
    );

    await assert.rejects(
        initializePaymentForUser({
            userId: user._id,
            productId: product._id,
            idempotencyKey,
            fetchImpl,
            secretKey: "test-secret-only"
        }),
        error => error.code === "PAYMENT_INITIALIZATION_NOT_RETRYABLE"
    );

    assert.equal(callCount, 1);
    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );
});
