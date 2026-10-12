"use strict";

import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";
import {
    claimNextPaystackWebhookEvent
} from "../../src/services/paystackWebhookClaimService.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_paystack_webhook_claim_test")
    );

    await PaystackWebhookEvent.syncIndexes();
});

beforeEach(async () => {
    await PaystackWebhookEvent.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function makeEvent(overrides = {}) {
    return {
        eventKey: `paystack:charge.success:${new mongoose.Types.ObjectId()}`,
        eventType: "charge.success",
        providerReference: `sf-ref-${new mongoose.Types.ObjectId()}`,
        providerTransactionId: String(Date.now()),
        payload: {
            event: "charge.success",
            data: {
                status: "success"
            }
        },
        ...overrides
    };
}

const workerA = {
    name: "paystack-webhook-worker",
    instanceId: "worker-a"
};

const workerB = {
    name: "paystack-webhook-worker",
    instanceId: "worker-b"
};

test("claims a received event and increments attempts", async () => {
    const created = await PaystackWebhookEvent.create(makeEvent());
    const now = new Date("2026-01-01T00:00:00.000Z");

    const claimed = await claimNextPaystackWebhookEvent({
        worker: workerA,
        leaseDurationMs: 30_000,
        now
    });

    assert.ok(claimed);
    assert.equal(String(claimed._id), String(created._id));
    assert.equal(claimed.status, "processing");
    assert.equal(claimed.attempts, 1);
    assert.equal(claimed.processingLease.owner.instanceId, "worker-a");
    assert.equal(claimed.processingLease.acquiredAt.getTime(), now.getTime());
    assert.equal(
        claimed.processingLease.expiresAt.getTime(),
        now.getTime() + 30_000
    );
    assert.ok(claimed.processingLease.leaseId);
});

test("two competing workers cannot claim the same unexpired event", async () => {
    await PaystackWebhookEvent.create(makeEvent());
    const now = new Date("2026-01-01T00:00:00.000Z");

    const results = await Promise.all([
        claimNextPaystackWebhookEvent({
            worker: workerA,
            leaseDurationMs: 30_000,
            now
        }),
        claimNextPaystackWebhookEvent({
            worker: workerB,
            leaseDurationMs: 30_000,
            now
        })
    ]);

    const successfulClaims = results.filter(Boolean);

    assert.equal(successfulClaims.length, 1);

    const stored = await PaystackWebhookEvent.findOne().lean();
    assert.equal(stored.status, "processing");
    assert.equal(stored.attempts, 1);
});

test("reclaims an event after its processing lease expires", async () => {
    const firstNow = new Date("2026-01-01T00:00:00.000Z");

    await PaystackWebhookEvent.create(
        makeEvent({
            status: "processing",
            attempts: 1,
            processingLease: {
                leaseId: "expired-lease",
                owner: workerA,
                acquiredAt: firstNow,
                expiresAt: new Date(firstNow.getTime() + 1_000)
            }
        })
    );

    const claimed = await claimNextPaystackWebhookEvent({
        worker: workerB,
        leaseDurationMs: 30_000,
        now: new Date(firstNow.getTime() + 1_000)
    });

    assert.ok(claimed);
    assert.equal(claimed.status, "processing");
    assert.equal(claimed.attempts, 2);
    assert.notEqual(claimed.processingLease.leaseId, "expired-lease");
    assert.equal(claimed.processingLease.owner.instanceId, "worker-b");
});

test("does not claim an event before its lease expires", async () => {
    const firstNow = new Date("2026-01-01T00:00:00.000Z");

    await PaystackWebhookEvent.create(
        makeEvent({
            status: "processing",
            attempts: 1,
            processingLease: {
                leaseId: "active-lease",
                owner: workerA,
                acquiredAt: firstNow,
                expiresAt: new Date(firstNow.getTime() + 30_000)
            }
        })
    );

    const claimed = await claimNextPaystackWebhookEvent({
        worker: workerB,
        now: new Date(firstNow.getTime() + 29_999)
    });

    assert.equal(claimed, null);
});

test("does not claim processed, failed, or reconciliation-required events", async () => {
    await PaystackWebhookEvent.create([
        makeEvent({
            eventKey: "paystack:test:processed",
            status: "processed",
            processedAt: new Date()
        }),
        makeEvent({
            eventKey: "paystack:test:failed",
            status: "failed"
        }),
        makeEvent({
            eventKey: "paystack:test:reconciliation",
            status: "reconciliation_required"
        })
    ]);

    const claimed = await claimNextPaystackWebhookEvent({
        worker: workerA
    });

    assert.equal(claimed, null);
});

test("rejects an invalid worker identity", async () => {
    await assert.rejects(
        claimNextPaystackWebhookEvent({
            worker: {
                name: "",
                instanceId: "worker-a"
            }
        }),
        error => error.code === "PAYSTACK_WEBHOOK_INVALID_WORKER"
    );
});

test("rejects an out-of-range lease duration", async () => {
    await assert.rejects(
        claimNextPaystackWebhookEvent({
            worker: workerA,
            leaseDurationMs: 600_000
        }),
        error => error.code === "PAYSTACK_WEBHOOK_INVALID_LEASE_DURATION"
    );
});
