
"use strict";

import assert from "node:assert/strict";
import test, { before, after, afterEach } from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";
import {
    requireMovieEntitlement
} from "../../src/middleware/playbackEntitlementMiddleware.js";

let mongoServer;
let testUserId;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_playback_entitlement_test")
    );

    await PurchaseEntitlement.syncIndexes();

    testUserId = new mongoose.Types.ObjectId();
});

afterEach(async () => {
    await PurchaseEntitlement.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function makeEntitlement(overrides = {}) {
    const now = Date.now();
    const startsAt = new Date(now - 60_000);

    return {
        paymentAttemptRef: new mongoose.Types.ObjectId(),
        attemptId: `playback-test-${randomUUID()}`,
        provider: "paystack",
        providerTransactionId: String(
            Math.floor(Math.random() * 1_000_000_000) + 1
        ),
        providerReference: `SF-${randomUUID()}`,
        userId: testUserId,
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        movieId: 9801,
        rentalDurationHours: 48,
        billingInterval: null,
        amountMinor: 100000,
        currency: "NGN",
        status: "active",
        grantedAt: startsAt,
        startsAt,
        expiresAt: new Date(now + 60 * 60 * 1000),
        revokedAt: null,
        ...overrides
    };
}

async function runMiddleware({
    userId = testUserId.toString(),
    movieId = "9801"
} = {}) {
    const req = {
        user: userId ? { id: userId } : undefined,
        params: { movieId }
    };

    const res = {
        statusCode: 200,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(body) {
            this.body = body;
            return this;
        }
    };

    let nextCalled = false;

    await requireMovieEntitlement(req, res, () => {
        nextCalled = true;
    });

    return { req, res, nextCalled };
}

test("active rental entitlement allows playback of its movie", async () => {
    await PurchaseEntitlement.create(makeEntitlement());

    const result = await runMiddleware();

    assert.equal(result.nextCalled, true);
    assert.equal(result.res.statusCode, 200);
    assert.equal(
        result.req.playbackEntitlement.purchaseType,
        "rental"
    );
    assert.equal(result.req.playbackEntitlement.movieId, 9801);
});

test("rental entitlement does not grant access to another movie", async () => {
    await PurchaseEntitlement.create(makeEntitlement());

    const result = await runMiddleware({
        movieId: "9802"
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
});

test("expired rental entitlement is denied", async () => {
    const now = Date.now();

    await PurchaseEntitlement.create(
        makeEntitlement({
            startsAt: new Date(now - 120_000),
            expiresAt: new Date(now - 1_000)
        })
    );

    const result = await runMiddleware();

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
});

test("revoked entitlement is denied", async () => {
    await PurchaseEntitlement.create(
        makeEntitlement({
            status: "revoked",
            revokedAt: new Date()
        })
    );

    const result = await runMiddleware();

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
});

test("active subscription grants access to a movie", async () => {
    const now = Date.now();
    const startsAt = new Date(now - 60_000);

    await PurchaseEntitlement.create(
        makeEntitlement({
            purchaseType: "subscription",
            movieId: null,
            rentalDurationHours: null,
            billingInterval: "monthly",
            startsAt,
            expiresAt: new Date(now + 60 * 60 * 1000)
        })
    );

    const result = await runMiddleware({
        movieId: "12345"
    });

    assert.equal(result.nextCalled, true);
    assert.equal(
        result.req.playbackEntitlement.purchaseType,
        "subscription"
    );
});

test("not-yet-active entitlement is denied", async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);

    await PurchaseEntitlement.create(
        makeEntitlement({
            startsAt,
            expiresAt: new Date(
                startsAt.getTime() + 48 * 60 * 60 * 1000
            )
        })
    );

    const result = await runMiddleware();

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
});

test("missing authentication is denied", async () => {
    const result = await runMiddleware({
        userId: null
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 401);
});

test("invalid movie IDs are rejected", async () => {
    for (const movieId of ["0", "-1", "1.5", "abc", "1e3"]) {
        const result = await runMiddleware({ movieId });

        assert.equal(result.nextCalled, false);
        assert.equal(result.res.statusCode, 400);
    }
});
