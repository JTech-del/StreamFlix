"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaymentAttempt from "../../src/models/PaymentAttempt.js";
import {
    transitionPaymentAttempt
} from "../../src/services/paymentAttemptTransitionService.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_transition_test")
    );

    await PaymentAttempt.syncIndexes();
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await PaymentAttempt.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

async function createAttempt(overrides = {}) {
    return PaymentAttempt.create({
        idempotencyKey: `transition-test-key-${crypto.randomUUID()}`,
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        priceSnapshot: {
            amountMinor: 100000,
            currency: "NGN"
        },
        ...overrides
    });
}

test("atomically transitions an attempt from created to initialization_pending", async () => {
    const attempt = await createAttempt();

    const result = await transitionPaymentAttempt({
        attemptId: attempt.attemptId,
        expectedStatus: "created",
        nextStatus: "initialization_pending"
    });

    assert.equal(result.outcome, "transitioned");
    assert.equal(result.attempt.status, "initialization_pending");

    const stored = await PaymentAttempt.findById(attempt._id);
    assert.equal(stored.status, "initialization_pending");
});

test("rejects a stale expected status without overwriting the current state", async () => {
    const attempt = await createAttempt({
        status: "pending"
    });

    await assert.rejects(
        transitionPaymentAttempt({
            attemptId: attempt.attemptId,
            expectedStatus: "created",
            nextStatus: "initialization_pending"
        }),
        error => error.code === "PAYMENT_ATTEMPT_STATUS_CONFLICT"
    );

    const stored = await PaymentAttempt.findById(attempt._id);
    assert.equal(stored.status, "pending");
});

test("does not permit generic transitions to mark a payment successful", async () => {
    const attempt = await createAttempt({
        status: "verification_pending"
    });

    await assert.rejects(
        transitionPaymentAttempt({
            attemptId: attempt.attemptId,
            expectedStatus: "verification_pending",
            nextStatus: "succeeded"
        }),
        error => error.code === "PAYMENT_FINALIZATION_REQUIRED"
    );

    const stored = await PaymentAttempt.findById(attempt._id);
    assert.equal(stored.status, "verification_pending");
});

test("reports a missing payment attempt", async () => {
    await assert.rejects(
        transitionPaymentAttempt({
            attemptId: "missing-payment-attempt",
            expectedStatus: "created",
            nextStatus: "initialization_pending"
        }),
        error => error.code === "PAYMENT_ATTEMPT_NOT_FOUND"
    );
});

test("rejects unsupported update details", async () => {
    const attempt = await createAttempt();

    await assert.rejects(
        transitionPaymentAttempt({
            attemptId: attempt.attemptId,
            expectedStatus: "created",
            nextStatus: "initialization_pending",
            details: {
                priceSnapshot: {
                    amountMinor: 1,
                    currency: "NGN"
                }
            }
        }),
        /Unsupported payment transition detail/
    );

    const stored = await PaymentAttempt.findById(attempt._id);
    assert.equal(stored.status, "created");
    assert.equal(stored.priceSnapshot.amountMinor, 100000);
});
