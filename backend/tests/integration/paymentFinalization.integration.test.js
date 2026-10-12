"use strict";

import assert from "node:assert/strict";
import test, { before, after, afterEach } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import PaymentAttempt from "../../src/models/PaymentAttempt.js";
import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";

import {
    finalizePaymentAttempt
} from "../../src/services/paymentFinalizationService.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: {
            count: 1
        }
    });

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_finalization_test")
    );

    await PaymentAttempt.syncIndexes();
    await PurchaseEntitlement.syncIndexes();
});

afterEach(async () => {
    await PurchaseEntitlement.deleteMany({});
    await PaymentAttempt.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

async function createPendingAttempt({
    purchaseType = "rental",
    billingInterval = null,
    amountMinor = 125000
} = {}) {
    const attemptId = `attempt-${randomUUID()}`;
    const id = randomUUID();

    const purchaseTermsSnapshot =
        purchaseType === "rental"
            ? {
                movieId: 9801,
                rentalDurationHours: 48,
                billingInterval: null
            }
            : {
                movieId: null,
                rentalDurationHours: null,
                billingInterval
            };

    return PaymentAttempt.create({
        attemptId,
        idempotencyKey: `finalization-test-${id}`,
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        purchaseType,
        priceSnapshot: {
            amountMinor,
            currency: "NGN"
        },
        purchaseTermsSnapshot,
        provider: "paystack",
        providerReference: `SF-${id}`,
        checkoutUrl: "https://checkout.paystack.com/test",
        status: "pending"
    });
}

function mockPaystackFetch({
    transactionId = 810001,
    amountMinor = 125000,
    currency = "NGN",
    status = "success",
    delayMs = 0
} = {}) {
    return async url => {
        if (delayMs) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const reference = decodeURIComponent(
            url.substring(url.lastIndexOf("/") + 1)
        );

        return {
            ok: true,
            status: 200,
            json: async () => ({
                status: true,
                data: {
                    reference,
                    amount: amountMinor,
                    currency,
                    id: transactionId,
                    status
                }
            })
        };
    };
}

const testSecretKey = "test-secret-only-not-a-real-key";

test("verified rental payment atomically finalizes and grants access", async () => {
    const attempt = await createPendingAttempt();
    const now = new Date("2026-01-15T10:00:00.000Z");

    const result = await finalizePaymentAttempt({
        attemptId: attempt.attemptId,
        fetchImpl: mockPaystackFetch({
            transactionId: 810001
        }),
        secretKey: testSecretKey,
        now
    });

    assert.equal(result.outcome, "finalized");
    assert.equal(result.attempt.status, "succeeded");
    assert.equal(result.attempt.providerTransactionId, "810001");

    assert.equal(result.entitlement.attemptId, attempt.attemptId);
    assert.equal(result.entitlement.providerTransactionId, "810001");
    assert.equal(result.entitlement.purchaseType, "rental");
    assert.equal(result.entitlement.movieId, 9801);
    assert.equal(result.entitlement.rentalDurationHours, 48);
    assert.equal(result.entitlement.amountMinor, 125000);
    assert.equal(result.entitlement.status, "active");

    assert.equal(
        result.entitlement.expiresAt.getTime(),
        now.getTime() + 48 * 60 * 60 * 1000
    );

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: attempt._id
        }),
        1
    );
});

test("repeating finalization does not grant a second entitlement", async () => {
    const attempt = await createPendingAttempt();
    let providerCallCount = 0;

    const fetchImpl = async (...args) => {
        providerCallCount += 1;
        return mockPaystackFetch({
            transactionId: 810002
        })(...args);
    };

    const first = await finalizePaymentAttempt({
        attemptId: attempt.attemptId,
        fetchImpl,
        secretKey: testSecretKey
    });

    const second = await finalizePaymentAttempt({
        attemptId: attempt.attemptId,
        fetchImpl,
        secretKey: testSecretKey
    });

    assert.equal(first.outcome, "finalized");
    assert.equal(second.outcome, "already_finalized");
    assert.equal(providerCallCount, 1);

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: attempt._id
        }),
        1
    );
});

test("incorrect provider amount cannot finalize or grant access", async () => {
    const attempt = await createPendingAttempt();

    await assert.rejects(
        finalizePaymentAttempt({
            attemptId: attempt.attemptId,
            fetchImpl: mockPaystackFetch({
                transactionId: 810003,
                amountMinor: 1
            }),
            secretKey: testSecretKey
        }),
        error => error.code === "PAYSTACK_VERIFICATION_MISMATCH"
    );

    const stored = await PaymentAttempt.findById(attempt._id);

    assert.equal(stored.status, "pending");
    assert.equal(stored.providerTransactionId, null);

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: attempt._id
        }),
        0
    );
});

test("one Paystack transaction cannot finalize two payment attempts", async () => {
    const first = await createPendingAttempt();
    const second = await createPendingAttempt();

    const fetchImpl = mockPaystackFetch({
        transactionId: 810004
    });

    const firstResult = await finalizePaymentAttempt({
        attemptId: first.attemptId,
        fetchImpl,
        secretKey: testSecretKey
    });

    assert.equal(firstResult.outcome, "finalized");

    await assert.rejects(
        finalizePaymentAttempt({
            attemptId: second.attemptId,
            fetchImpl,
            secretKey: testSecretKey
        }),
        error => error.code === "PAYMENT_TRANSACTION_ALREADY_APPLIED"
    );

    const storedSecond = await PaymentAttempt.findById(second._id);

    assert.equal(storedSecond.status, "pending");

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            providerTransactionId: "810004"
        }),
        1
    );
});

test("concurrent finalization grants access only once", async () => {
    const attempt = await createPendingAttempt();

    const fetchImpl = mockPaystackFetch({
        transactionId: 810005,
        delayMs: 25
    });

    const results = await Promise.all([
        finalizePaymentAttempt({
            attemptId: attempt.attemptId,
            fetchImpl,
            secretKey: testSecretKey
        }),
        finalizePaymentAttempt({
            attemptId: attempt.attemptId,
            fetchImpl,
            secretKey: testSecretKey
        })
    ]);

    assert.ok(
        results.every(result =>
            ["finalized", "already_finalized"].includes(result.outcome)
        )
    );

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: attempt._id
        }),
        1
    );

    const stored = await PaymentAttempt.findById(attempt._id);

    assert.equal(stored.status, "succeeded");
    assert.equal(stored.providerTransactionId, "810005");
});

test("monthly subscription expiry clamps safely at month end", async () => {
    const attempt = await createPendingAttempt({
        purchaseType: "subscription",
        billingInterval: "monthly"
    });

    const now = new Date("2026-01-31T12:00:00.000Z");

    const result = await finalizePaymentAttempt({
        attemptId: attempt.attemptId,
        fetchImpl: mockPaystackFetch({
            transactionId: 810006
        }),
        secretKey: testSecretKey,
        now
    });

    assert.equal(result.outcome, "finalized");
    assert.equal(result.entitlement.purchaseType, "subscription");
    assert.equal(result.entitlement.billingInterval, "monthly");
    assert.equal(result.entitlement.movieId, null);
    assert.equal(result.entitlement.rentalDurationHours, null);
    assert.equal(
        result.entitlement.expiresAt.toISOString(),
        "2026-02-28T12:00:00.000Z"
    );
});