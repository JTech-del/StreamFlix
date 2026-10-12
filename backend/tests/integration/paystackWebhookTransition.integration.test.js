"use strict";

import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import PaystackWebhookEvent from "../../src/models/PaystackWebhookEvent.js";
import {
    claimNextPaystackWebhookEvent
} from "../../src/services/paystackWebhookClaimService.js";
import {
    completePaystackWebhookEvent,
    failPaystackWebhookEvent,
    requirePaystackWebhookReconciliation
} from "../../src/services/paystackWebhookTransitionService.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_paystack_webhook_transition_test")
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
            data: { status: "success" }
        },
        ...overrides
    };
}

const workerA = {
    name: "paystack-webhook-worker",
    instanceId: "worker-a"
};

async function claimEvent(now = new Date()) {
    await PaystackWebhookEvent.create(makeEvent());

    return claimNextPaystackWebhookEvent({
        worker: workerA,
        leaseDurationMs: 30_000,
        now
    });
}

test("completes an event and clears its lease", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    const completed = await completePaystackWebhookEvent({
        eventId: String(claimed._id),
        leaseId: claimed.processingLease.leaseId,
        now: new Date(now.getTime() + 1_000)
    });

    assert.equal(completed.status, "processed");
    assert.ok(completed.processedAt);
    assert.equal(completed.processingLease, null);
    assert.equal(completed.lastError.code, null);
});

test("marks a deliberately failed event and records sanitized error details", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    const failed = await failPaystackWebhookEvent({
        eventId: String(claimed._id),
        leaseId: claimed.processingLease.leaseId,
        errorDetails: {
            code: "PAYLOAD_UNSUPPORTED",
            message: "The event type is not supported."
        },
        now: new Date(now.getTime() + 1_000)
    });

    assert.equal(failed.status, "failed");
    assert.equal(failed.lastError.code, "PAYLOAD_UNSUPPORTED");
    assert.equal(
        failed.lastError.message,
        "The event type is not supported."
    );
    assert.equal(failed.processingLease, null);
});

test("marks an uncertain outcome for reconciliation", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    const event = await requirePaystackWebhookReconciliation({
        eventId: String(claimed._id),
        leaseId: claimed.processingLease.leaseId,
        errorDetails: {
            code: "PAYMENT_OUTCOME_UNCERTAIN",
            message: "Payment outcome requires reconciliation."
        },
        now: new Date(now.getTime() + 1_000)
    });

    assert.equal(event.status, "reconciliation_required");
    assert.equal(event.lastError.code, "PAYMENT_OUTCOME_UNCERTAIN");
    assert.equal(event.processingLease, null);
});

test("rejects completion using an incorrect lease ID", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    await assert.rejects(
        completePaystackWebhookEvent({
            eventId: String(claimed._id),
            leaseId: "not-the-current-lease",
            now: new Date(now.getTime() + 1_000)
        }),
        error => error.code === "PAYSTACK_WEBHOOK_LEASE_LOST"
    );

    const stored = await PaystackWebhookEvent.findById(claimed._id).lean();
    assert.equal(stored.status, "processing");
});

test("rejects a stale worker after another worker reclaims the event", async () => {
    const firstNow = new Date("2026-01-01T00:00:00.000Z");
    const firstClaim = await claimEvent(firstNow);

    const secondClaim = await claimNextPaystackWebhookEvent({
        worker: {
            name: "paystack-webhook-worker",
            instanceId: "worker-b"
        },
        leaseDurationMs: 30_000,
        now: new Date(firstNow.getTime() + 30_000)
    });

    assert.ok(secondClaim);
    assert.notEqual(
        secondClaim.processingLease.leaseId,
        firstClaim.processingLease.leaseId
    );

    await assert.rejects(
        completePaystackWebhookEvent({
            eventId: String(firstClaim._id),
            leaseId: firstClaim.processingLease.leaseId,
            now: new Date(firstNow.getTime() + 30_001)
        }),
        error => error.code === "PAYSTACK_WEBHOOK_LEASE_LOST"
    );

    const stored = await PaystackWebhookEvent.findById(firstClaim._id).lean();
    assert.equal(stored.status, "processing");
    assert.equal(stored.processingLease.owner.instanceId, "worker-b");
});

test("rejects a transition when the lease has expired", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    await assert.rejects(
        completePaystackWebhookEvent({
            eventId: String(claimed._id),
            leaseId: claimed.processingLease.leaseId,
            now: new Date(now.getTime() + 30_000)
        }),
        error => error.code === "PAYSTACK_WEBHOOK_LEASE_LOST"
    );
});

test("rejects missing or invalid error details", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const claimed = await claimEvent(now);

    await assert.rejects(
        failPaystackWebhookEvent({
            eventId: String(claimed._id),
            leaseId: claimed.processingLease.leaseId,
            errorDetails: {
                code: "ERROR",
                message: ""
            },
            now: new Date(now.getTime() + 1_000)
        }),
        error => error.code === "PAYSTACK_WEBHOOK_INVALID_ERROR_DETAILS"
    );
});
