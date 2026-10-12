"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaymentAttempt from "../../src/models/PaymentAttempt.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_attempt_test")
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

function makeAttempt(overrides = {}) {
    return {
        idempotencyKey: "payment-test-key-000001",
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        priceSnapshot: {
            amountMinor: 100000,
            currency: "NGN"
        },
        ...overrides
    };
}

test("persists and retrieves the payment price snapshot", async () => {
    const created = await PaymentAttempt.create(makeAttempt());

    const found = await PaymentAttempt.findById(created._id).lean();

    assert.ok(found);
    assert.equal(found.attemptId, created.attemptId);
    assert.equal(found.idempotencyKey, "payment-test-key-000001");
    assert.equal(found.priceSnapshot.amountMinor, 100000);
    assert.equal(found.priceSnapshot.currency, "NGN");
    assert.equal(found.status, "created");
    assert.equal(found.providerReference, null);
});

test("MongoDB enforces unique idempotency keys", async () => {
    const attempt = makeAttempt({
        idempotencyKey: "payment-duplicate-key-0001"
    });

    await PaymentAttempt.create(attempt);

    await assert.rejects(
        PaymentAttempt.create({
            ...attempt,
            userId: new mongoose.Types.ObjectId()
        }),
        error => error.code === 11000
    );

    assert.equal(
        await PaymentAttempt.countDocuments({
            idempotencyKey: "payment-duplicate-key-0001"
        }),
        1
    );
});

test("MongoDB enforces unique provider references", async () => {
    await PaymentAttempt.create(
        makeAttempt({
            idempotencyKey: "payment-reference-key-0001",
            providerReference: "sf-paystack-test-reference-001"
        })
    );

    await assert.rejects(
        PaymentAttempt.create(
            makeAttempt({
                idempotencyKey: "payment-reference-key-0002",
                providerReference: "sf-paystack-test-reference-001"
            })
        ),
        error => error.code === 11000
    );

    assert.equal(
        await PaymentAttempt.countDocuments({
            providerReference: "sf-paystack-test-reference-001"
        }),
        1
    );
});

test("multiple attempts may have no provider reference yet", async () => {
    await PaymentAttempt.create(
        makeAttempt({
            idempotencyKey: "payment-no-reference-key-001"
        })
    );

    await PaymentAttempt.create(
        makeAttempt({
            idempotencyKey: "payment-no-reference-key-002"
        })
    );

    assert.equal(
        await PaymentAttempt.countDocuments({
            idempotencyKey: {
                $in: [
                    "payment-no-reference-key-001",
                    "payment-no-reference-key-002"
                ]
            },
            providerReference: null
        }),
        2
    );
});
