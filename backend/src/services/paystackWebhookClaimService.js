"use strict";

import { randomUUID } from "node:crypto";

import PaystackWebhookEvent from "../models/PaystackWebhookEvent.js";

const DEFAULT_LEASE_DURATION_MS = 30_000;
const MAX_LEASE_DURATION_MS = 300_000;

function createClaimError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function validateWorker(worker) {
    if (
        !worker ||
        typeof worker.name !== "string" ||
        worker.name.trim() === "" ||
        worker.name.trim().length > 100 ||
        typeof worker.instanceId !== "string" ||
        worker.instanceId.trim() === "" ||
        worker.instanceId.trim().length > 200
    ) {
        throw createClaimError(
            "A valid webhook worker identity is required.",
            "PAYSTACK_WEBHOOK_INVALID_WORKER"
        );
    }

    return {
        name: worker.name.trim(),
        instanceId: worker.instanceId.trim()
    };
}

function validateClaimOptions({ leaseDurationMs, now }) {
    if (
        !Number.isSafeInteger(leaseDurationMs) ||
        leaseDurationMs < 1_000 ||
        leaseDurationMs > MAX_LEASE_DURATION_MS
    ) {
        throw createClaimError(
            "Webhook lease duration must be between 1000 and 300000 milliseconds.",
            "PAYSTACK_WEBHOOK_INVALID_LEASE_DURATION"
        );
    }

    if (
        !(now instanceof Date) ||
        !Number.isFinite(now.getTime())
    ) {
        throw createClaimError(
            "A valid claim timestamp is required.",
            "PAYSTACK_WEBHOOK_INVALID_TIMESTAMP"
        );
    }
}

export async function claimNextPaystackWebhookEvent({
    worker,
    leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
    now = new Date()
} = {}) {
    const owner = validateWorker(worker);

    validateClaimOptions({
        leaseDurationMs,
        now
    });

    const leaseId = randomUUID();
    const acquiredAt = new Date(now.getTime());
    const expiresAt = new Date(
        acquiredAt.getTime() + leaseDurationMs
    );

    return PaystackWebhookEvent.findOneAndUpdate(
        {
            $or: [
                {
                    status: "received"
                },
                {
                    status: "processing",
                    "processingLease.expiresAt": {
                        $lte: acquiredAt
                    }
                }
            ]
        },
        {
            $set: {
                status: "processing",
                processingLease: {
                    leaseId,
                    owner,
                    acquiredAt,
                    expiresAt
                }
            },
            $inc: {
                attempts: 1
            }
        },
        {
            returnDocument: "after",
            sort: {
                receivedAt: 1,
                _id: 1
            },
            runValidators: true
        }
    );
}
