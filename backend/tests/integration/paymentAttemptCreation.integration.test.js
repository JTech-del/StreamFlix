"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

import ProductCatalogue from "../../src/models/ProductCatalogue.js";
import PaymentAttempt from "../../src/models/PaymentAttempt.js";
import {
    createPaymentAttempt
} from "../../src/services/paymentAttemptCreationService.js";

let mongoServer;
let testUserId;
let activeRental;
let inactiveRental;
let activeSubscription;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_payment_creation_test")
    );

    await ProductCatalogue.syncIndexes();
    await PaymentAttempt.syncIndexes();

    testUserId = new mongoose.Types.ObjectId();

    activeRental = await ProductCatalogue.create({
    productCode: "creation-active-rental",
    productType: "rental",
    displayName: "Creation Test Rental",
    movieId: 87001,
    rentalDurationHours: 48,
    priceMinor: 125000,
    currency: "NGN",
    status: "active"
});

inactiveRental = await ProductCatalogue.create({
    productCode: "creation-inactive-rental",
    productType: "rental",
    displayName: "Inactive Test Rental",
    movieId: 87002,
    rentalDurationHours: 48,
    priceMinor: 90000,
    currency: "NGN",
    status: "inactive"
});

    activeSubscription = await ProductCatalogue.create({
        productCode: "creation-active-monthly",
        productType: "subscription",
        displayName: "Creation Test Monthly Plan",
        billingInterval: "monthly",
        priceMinor: 350000,
        currency: "NGN",
        status: "active"
    });
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await PaymentAttempt.deleteMany({});
        await ProductCatalogue.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function newKey() {
    return `creation-test-${randomUUID()}`;
}

test("creates an attempt using the active catalogue price, not a client price", async () => {
    const result = await createPaymentAttempt({
        userId: testUserId,
        productId: activeRental._id,
        idempotencyKey: newKey(),
        amountMinor: 1,
        currency: "USD"
    });

    assert.equal(result.outcome, "created");
    assert.equal(result.attempt.userId.toString(), testUserId.toString());
    assert.equal(result.attempt.productId.toString(), activeRental._id.toString());
    assert.equal(result.attempt.purchaseType, "rental");
    assert.equal(result.attempt.priceSnapshot.amountMinor, 125000);
    assert.equal(result.attempt.priceSnapshot.currency, "NGN");

// Verify the purchase terms snapshot.
assert.equal(
    result.attempt.purchaseTermsSnapshot.movieId,
    87001
);
assert.equal(
    result.attempt.purchaseTermsSnapshot.rentalDurationHours,
    48
);
assert.equal(
    result.attempt.purchaseTermsSnapshot.billingInterval,
    null
);

    assert.equal(result.attempt.status, "created");
    assert.equal(result.attempt.providerReference, null);
});

test("creates a subscription attempt from its catalogue product", async () => {
    const result = await createPaymentAttempt({
        userId: testUserId,
        productId: activeSubscription._id,
        idempotencyKey: newKey()
    });

    assert.equal(result.outcome, "created");
    assert.equal(result.attempt.purchaseType, "subscription");
    assert.equal(result.attempt.priceSnapshot.amountMinor, 350000);
    assert.equal(result.attempt.priceSnapshot.currency, "NGN");
});

test("returns the existing attempt for the same user, product, and key", async () => {
    const idempotencyKey = newKey();

    const first = await createPaymentAttempt({
        userId: testUserId,
        productId: activeRental._id,
        idempotencyKey
    });

    const second = await createPaymentAttempt({
        userId: testUserId,
        productId: activeRental._id,
        idempotencyKey
    });

    assert.equal(first.outcome, "created");
    assert.equal(second.outcome, "existing_attempt");
    assert.equal(second.attempt.attemptId, first.attempt.attemptId);

    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );
});

test("rejects reusing a key for another product", async () => {
    const idempotencyKey = newKey();

    await createPaymentAttempt({
        userId: testUserId,
        productId: activeRental._id,
        idempotencyKey
    });

    await assert.rejects(
        createPaymentAttempt({
            userId: testUserId,
            productId: activeSubscription._id,
            idempotencyKey
        }),
        error => error.code === "PAYMENT_IDEMPOTENCY_KEY_CONFLICT"
    );
});

test("does not reveal an attempt when another user reuses its key", async () => {
    const idempotencyKey = newKey();

    await createPaymentAttempt({
        userId: testUserId,
        productId: activeRental._id,
        idempotencyKey
    });

    await assert.rejects(
        createPaymentAttempt({
            userId: new mongoose.Types.ObjectId(),
            productId: activeRental._id,
            idempotencyKey
        }),
        error => error.code === "PAYMENT_IDEMPOTENCY_KEY_CONFLICT"
    );
});

test("rejects inactive and nonexistent products", async () => {
    await assert.rejects(
        createPaymentAttempt({
            userId: testUserId,
            productId: inactiveRental._id,
            idempotencyKey: newKey()
        }),
        error => error.code === "PAYMENT_PRODUCT_UNAVAILABLE"
    );

    await assert.rejects(
        createPaymentAttempt({
            userId: testUserId,
            productId: new mongoose.Types.ObjectId(),
            idempotencyKey: newKey()
        }),
        error => error.code === "PAYMENT_PRODUCT_UNAVAILABLE"
    );
});

test("validates IDs and idempotency-key format before database writes", async () => {
    await assert.rejects(
        createPaymentAttempt({
            userId: "not-an-object-id",
            productId: activeRental._id,
            idempotencyKey: newKey()
        }),
        error => error.code === "INVALID_PAYMENT_USER_ID"
    );

    await assert.rejects(
        createPaymentAttempt({
            userId: testUserId,
            productId: activeRental._id,
            idempotencyKey: "short"
        }),
        error => error.code === "INVALID_PAYMENT_IDEMPOTENCY_KEY"
    );
});

test("concurrent same-key requests create only one attempt", async () => {
    const idempotencyKey = newKey();

    const results = await Promise.all([
        createPaymentAttempt({
            userId: testUserId,
            productId: activeRental._id,
            idempotencyKey
        }),
        createPaymentAttempt({
            userId: testUserId,
            productId: activeRental._id,
            idempotencyKey
        })
    ]);

    assert.equal(
        await PaymentAttempt.countDocuments({ idempotencyKey }),
        1
    );

    assert.equal(results[0].attempt.attemptId, results[1].attempt.attemptId);
    assert.ok(
        results.every(result =>
            ["created", "existing_attempt"].includes(result.outcome)
        )
    );
});
