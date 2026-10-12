
"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";

let mongoServer;
let transactionSequence = 10000;

function makeEntitlement(overrides = {}) {
    const grantedAt = new Date("2026-01-01T00:00:00.000Z");

    return {
        paymentAttemptRef: new mongoose.Types.ObjectId(),
        attemptId: `attempt-${randomUUID()}`,
        provider: "paystack",
        providerTransactionId: String(++transactionSequence),
        providerReference: `SF-${randomUUID()}`,
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        movieId: 9801,
        rentalDurationHours: 48,
        billingInterval: null,
        amountMinor: 100000,
        currency: "NGN",
        status: "active",
        grantedAt,
        startsAt: grantedAt,
        expiresAt: new Date(
            grantedAt.getTime() + 48 * 60 * 60 * 1000
        ),
        ...overrides
    };
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_purchase_entitlement_test")
    );

    await PurchaseEntitlement.syncIndexes();
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await PurchaseEntitlement.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test("persists and retrieves a rental entitlement", async () => {
    const data = makeEntitlement();

    const created = await PurchaseEntitlement.create(data);

    const found = await PurchaseEntitlement.findById(created._id).lean();

    assert.ok(found);
    assert.equal(found.attemptId, data.attemptId);
    assert.equal(
        found.paymentAttemptRef.toString(),
        data.paymentAttemptRef.toString()
    );
    assert.equal(
        found.providerTransactionId,
        data.providerTransactionId
    );
    assert.equal(found.providerReference, data.providerReference);
    assert.equal(found.userId.toString(), data.userId.toString());
    assert.equal(found.purchaseType, "rental");
    assert.equal(found.movieId, 9801);
    assert.equal(found.rentalDurationHours, 48);
    assert.equal(found.amountMinor, 100000);
    assert.equal(found.currency, "NGN");
    assert.equal(found.status, "active");
    assert.ok(found.expiresAt > found.startsAt);
});

test("rejects a rental entitlement without a valid duration", async () => {
    for (const rentalDurationHours of [null, 0, -1, 1.5]) {
        const entitlement = new PurchaseEntitlement(
            makeEntitlement({ rentalDurationHours })
        );

        await assert.rejects(
            entitlement.validate(),
            error =>
                error.name === "ValidationError" &&
                Boolean(error.errors.rentalDurationHours)
        );
    }
});

test("rejects subscription entitlements with movie rental fields", async () => {
    const entitlement = new PurchaseEntitlement(
        makeEntitlement({
            purchaseType: "subscription",
            movieId: 9801,
            rentalDurationHours: 48,
            billingInterval: "monthly"
        })
    );

    await assert.rejects(
        entitlement.validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.movieId) &&
            Boolean(error.errors.rentalDurationHours)
    );
});

test("rejects an entitlement whose expiry is not after its start", async () => {
    const startsAt = new Date("2026-01-01T00:00:00.000Z");

    const entitlement = new PurchaseEntitlement(
        makeEntitlement({
            grantedAt: startsAt,
            startsAt,
            expiresAt: startsAt
        })
    );

    await assert.rejects(
        entitlement.validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.expiresAt)
    );
});

test("MongoDB prevents duplicate payment-attempt grants", async () => {
    const first = makeEntitlement();

    await PurchaseEntitlement.create(first);

    await assert.rejects(
        PurchaseEntitlement.create(
            makeEntitlement({
                paymentAttemptRef: first.paymentAttemptRef
            })
        ),
        error => error.code === 11000
    );

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            paymentAttemptRef: first.paymentAttemptRef
        }),
        1
    );
});

test("MongoDB prevents reuse of a Paystack transaction ID", async () => {
    const first = makeEntitlement();

    await PurchaseEntitlement.create(first);

    await assert.rejects(
        PurchaseEntitlement.create(
            makeEntitlement({
                providerTransactionId: first.providerTransactionId
            })
        ),
        error => error.code === 11000
    );

    assert.equal(
        await PurchaseEntitlement.countDocuments({
            providerTransactionId: first.providerTransactionId
        }),
        1
    );
});
