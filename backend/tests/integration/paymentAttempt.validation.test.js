"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import PaymentAttempt from "../../src/models/PaymentAttempt.js";

const userId = new mongoose.Types.ObjectId();
const rentalProductId = new mongoose.Types.ObjectId();
const subscriptionProductId = new mongoose.Types.ObjectId();

function validAttempt(overrides = {}) {
    return new PaymentAttempt({
        idempotencyKey: "test-idempotency-key-0001",
        userId,
        productId: rentalProductId,
        purchaseType: "rental",
        priceSnapshot: {
            amountMinor: 100000,
            currency: "NGN"
        },
        ...overrides
    });
}

test("valid rental payment attempt passes validation", async () => {
    const attempt = validAttempt();

    await attempt.validate();

    assert.ok(attempt.attemptId);
    assert.ok(attempt.correlationId);
    assert.equal(attempt.status, "created");
    assert.equal(attempt.provider, "paystack");
    assert.equal(attempt.priceSnapshot.amountMinor, 100000);
    assert.equal(attempt.priceSnapshot.currency, "NGN");
});

test("valid subscription payment attempt passes validation", async () => {
    const attempt = validAttempt({
        idempotencyKey: "test-subscription-key-0001",
        productId: subscriptionProductId,
        purchaseType: "subscription"
    });

    await attempt.validate();

    assert.equal(attempt.purchaseType, "subscription");
});

test("missing idempotency key is rejected", async () => {
    const attempt = validAttempt({
        idempotencyKey: undefined
    });

    await assert.rejects(attempt.validate());
});

test("short idempotency key is rejected", async () => {
    const attempt = validAttempt({
        idempotencyKey: "short"
    });

    await assert.rejects(attempt.validate());
});

test("missing customer is rejected", async () => {
    const attempt = validAttempt({
        userId: undefined
    });

    await assert.rejects(attempt.validate());
});

test("missing product reference is rejected", async () => {
    const attempt = validAttempt({
        productId: undefined
    });

    await assert.rejects(attempt.validate());
});

test("missing price snapshot is rejected", async () => {
    const attempt = validAttempt({
        priceSnapshot: undefined
    });

    await assert.rejects(attempt.validate());
});

test("fractional amount is rejected", async () => {
    const attempt = validAttempt({
        priceSnapshot: {
            amountMinor: 1000.5,
            currency: "NGN"
        }
    });

    await assert.rejects(attempt.validate());
});

test("zero and negative amounts are rejected", async () => {
    for (const amountMinor of [0, -100]) {
        const attempt = validAttempt({
            priceSnapshot: {
                amountMinor,
                currency: "NGN"
            }
        });

        await assert.rejects(attempt.validate());
    }
});

test("unsupported currency is rejected", async () => {
    const attempt = validAttempt({
        priceSnapshot: {
            amountMinor: 100000,
            currency: "USD"
        }
    });

    await assert.rejects(attempt.validate());
});

test("unsupported payment status is rejected", async () => {
    const attempt = validAttempt({
        status: "refunded"
    });

    await assert.rejects(attempt.validate());
});

test("unsupported purchase type is rejected", async () => {
    const attempt = validAttempt({
        purchaseType: "gift"
    });

    await assert.rejects(attempt.validate());
});
