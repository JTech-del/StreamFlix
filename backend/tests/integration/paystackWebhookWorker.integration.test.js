
"use strict";

import assert from "node:assert/strict";
import test, { before, after, afterEach } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import PaymentAttempt from "../../src/models/PaymentAttempt.js";
import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";
import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";

import {
    processNextPaystackWebhookEvent
} from "../../src/workers/paystackWebhookWorker.js";

let mongoServer;
let sequence = 920000;

const testSecretKey = "test-secret-only-not-a-real-key";

before(async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: {
            count: 1
        }
    });

    await mongoose.connect(
        mongoServer.getUri("streamflix_paystack_worker_test")
    );

    await PaymentAttempt.syncIndexes();
    await PurchaseEntitlement.syncIndexes();
    await PaystackWebhookEvent.syncIndexes();
});

afterEach(async () => {
    await PurchaseEntitlement.deleteMany({});
    await PaystackWebhookEvent.deleteMany({});
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

async function createAttempt() {
    const suffix = randomUUID();
    const attemptId = `worker-attempt-${suffix}`;
    const reference = `SF-worker-${suffix}`;

    const attempt = await PaymentAttempt.create({
        attemptId,
        idempotencyKey: `worker-test-${suffix}`,
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        priceSnapshot: {
            amountMinor: 125000,
            currency: "NGN"
        },
        purchaseTermsSnapshot: {
            movieId: 9801,
            rentalDurationHours: 48,
            billingInterval: null
        },
        provider: "paystack",
        providerReference: reference,
        checkoutUrl: "https://checkout.paystack.com/test",
        status: "pending"
    });

    return attempt;
}

async function createWebhook({
    eventType = "charge.success",
    reference,
    transactionId = ++sequence
}) {
    const data = {
        reference,
        id: transactionId,
        amount: 125000,
        currency: "NGN",
        status: "success"
    };

    return PaystackWebhookEvent.create({
        eventKey: `test:${randomUUID()}`,
        eventType,
        providerReference: reference ?? null,
        providerTransactionId:
            transactionId == null ? null : String(transactionId),
        payload: {
            event: eventType,
            data
        },
        status: "received",
        receivedAt: new Date()
    });
}

function mockVerification({
    transactionId,
    amountMinor = 125000,
    currency = "NGN",
    status = "success",
    shouldThrow = false
}) {
    return async url => {
        if (shouldThrow) {
            throw new Error("Simulated network interruption");
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

const testWorker = {
    workerName: "paystack-webhook-test-worker",
    instanceId: `test-${process.pid}`
};

test("processes charge.success and finalizes the payment", async () => {
    const attempt = await createAttempt();
    const transactionId = ++sequence;

    await createWebhook({
        reference: attempt.providerReference,
        transactionId
    });

    const result = await processNextPaystackWebhookEvent({
        ...testWorker,
        fetchImpl: mockVerification({ transactionId }),
        secretKey: testSecretKey
    });

    assert.equal(result.outcome, "processed");
    assert.equal(result.action, "payment_finalized");

    const storedAttempt = await PaymentAttempt.findById(attempt._id);
    const storedEvent = await PaystackWebhookEvent.findOne({
        providerReference: attempt.providerReference
    });

    assert.equal(storedAttempt.status, "succeeded");
    assert.equal(
        storedAttempt.providerTransactionId,
        String(transactionId)
    );
    assert.equal(storedEvent.status, "processed");

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: attempt._id
        }),
        1
    );
});

test("ignores non-charge.success events without granting access", async () => {
    await createWebhook({
        eventType: "charge.failed",
        reference: "unrelated-reference",
        transactionId: ++sequence
    });

    const result = await processNextPaystackWebhookEvent({
        ...testWorker,
        fetchImpl: mockVerification({
            transactionId: ++sequence
        }),
        secretKey: testSecretKey
    });

    assert.equal(result.outcome, "processed");
    assert.equal(result.action, "ignored_non_success_event");

    const storedEvent = await PaystackWebhookEvent.findOne({
        providerReference: "unrelated-reference"
    });

    assert.equal(storedEvent.status, "processed");
    assert.equal(await PurchaseEntitlement.countDocuments({}), 0);
});

test("transaction ID mismatch requires reconciliation and grants no access", async () => {
    const attempt = await createAttempt();
    const webhookTransactionId = ++sequence;
    const verifiedTransactionId = ++sequence;

    await createWebhook({
        reference: attempt.providerReference,
        transactionId: webhookTransactionId
    });

    const result = await processNextPaystackWebhookEvent({
        ...testWorker,
        fetchImpl: mockVerification({
            transactionId: verifiedTransactionId
        }),
        secretKey: testSecretKey
    });

    assert.equal(result.outcome, "reconciliation_required");

    const storedAttempt = await PaymentAttempt.findById(attempt._id);
    const storedEvent = await PaystackWebhookEvent.findOne({
        providerReference: attempt.providerReference
    });

    assert.equal(storedAttempt.status, "pending");
    assert.equal(storedEvent.status, "reconciliation_required");
    assert.equal(await PurchaseEntitlement.countDocuments({}), 0);
});

test("uncertain provider verification remains retryable under its lease", async () => {
    const attempt = await createAttempt();

    await createWebhook({
        reference: attempt.providerReference,
        transactionId: ++sequence
    });

    const result = await processNextPaystackWebhookEvent({
        ...testWorker,
        fetchImpl: mockVerification({
            transactionId: ++sequence,
            shouldThrow: true
        }),
        secretKey: testSecretKey
    });

    assert.equal(
        result.outcome,
        "retry_waiting_for_lease_expiry"
    );

    const storedEvent = await PaystackWebhookEvent.findOne({
        providerReference: attempt.providerReference
    });

    const storedAttempt = await PaymentAttempt.findById(attempt._id);

    assert.equal(storedEvent.status, "processing");
    assert.ok(storedEvent.processingLease.expiresAt > new Date());
    assert.equal(storedAttempt.status, "pending");
    assert.equal(await PurchaseEntitlement.countDocuments({}), 0);
});

test("missing payment attempt is marked for reconciliation", async () => {
    const reference = `SF-missing-${randomUUID()}`;

    await createWebhook({
        reference,
        transactionId: ++sequence
    });

    const result = await processNextPaystackWebhookEvent({
        ...testWorker,
        fetchImpl: mockVerification({
            transactionId: ++sequence
        }),
        secretKey: testSecretKey
    });

    assert.equal(result.outcome, "reconciliation_required");

    const storedEvent = await PaystackWebhookEvent.findOne({
        providerReference: reference
    });

    assert.equal(storedEvent.status, "reconciliation_required");
    assert.equal(await PurchaseEntitlement.countDocuments({}), 0);
});
