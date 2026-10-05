"use strict";

import { randomUUID } from "node:crypto";

import OutboxEvent from "../models/OutboxEvent.js";

const DEFAULT_LEASE_DURATION_MS = 30_000;
const MAX_LEASE_DURATION_MS = 300_000;
const DEFAULT_RECOVERY_LIMIT = 100;

function validateEventId(eventId) {
    if (
        typeof eventId !== "string" ||
        eventId.trim().length === 0
    ) {
        const error = new Error(
            "Outbox event ID is required."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_EVENT_ID";

        throw error;
    }
}

function validateOwner(owner) {
    if (
        !owner ||
        typeof owner !== "object" ||
        Array.isArray(owner)
    ) {
        const error = new Error(
            "Outbox dispatch lease owner is required."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_OWNER";

        throw error;
    }

    if (
        typeof owner.name !== "string" ||
        owner.name.trim().length === 0
    ) {
        const error = new Error(
            "Outbox dispatch lease owner name is required."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_OWNER";

        throw error;
    }

    if (
        typeof owner.instanceId !== "string" ||
        owner.instanceId.trim().length === 0
    ) {
        const error = new Error(
            "Outbox dispatch lease owner instance ID is required."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_OWNER";

        throw error;
    }
}

function normalizeLeaseDuration(
    leaseDurationMs
) {
    const duration =
        Number(leaseDurationMs);

    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        const error = new Error(
            "Outbox dispatch lease duration must be greater than zero."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_DURATION";

        throw error;
    }

    return Math.min(
        duration,
        MAX_LEASE_DURATION_MS
    );
}

export async function claimOutboxDispatchLease(
    eventId,
    owner,
    leaseDurationMs =
        DEFAULT_LEASE_DURATION_MS
) {
    validateEventId(eventId);
    validateOwner(owner);

    const duration =
        normalizeLeaseDuration(
            leaseDurationMs
        );

    const acquiredAt =
        new Date();

    const expiresAt =
        new Date(
            acquiredAt.getTime() +
            duration
        );

    const leaseId =
        randomUUID();

    const leasedEvent =
        await OutboxEvent.findOneAndUpdate(
            {
                eventId,
                status: "pending",
                $or: [
                    {
                        dispatchLease: null
                    },
                    {
                        "dispatchLease.expiresAt": {
                            $lte: acquiredAt
                        }
                    }
                ]
            },
            {
                $set: {
                    dispatchLease: {
                        leaseId,
                        owner: {
                            name:
                                owner.name.trim(),
                            instanceId:
                                owner.instanceId.trim()
                        },
                        acquiredAt,
                        expiresAt
                    }
                }
            },
            {
                returnDocument: "after"
            }
        );

    return leasedEvent;
}

export async function releaseOutboxDispatchLease(
    eventId,
    leaseId
) {
    validateEventId(eventId);

    if (
        typeof leaseId !== "string" ||
        leaseId.trim().length === 0
    ) {
        const error = new Error(
            "Outbox dispatch lease ID is required."
        );

        error.code =
            "INVALID_OUTBOX_DISPATCH_LEASE_ID";

        throw error;
    }

    const releasedEvent =
        await OutboxEvent.findOneAndUpdate(
            {
                eventId,
                status: "pending",
                "dispatchLease.leaseId":
                    leaseId
            },
            {
                $set: {
                    dispatchLease: null
                }
            },
            {
                returnDocument: "after"
            }
        );

    return releasedEvent;
}

export async function recoverExpiredOutboxDispatchLeases({
    limit = DEFAULT_RECOVERY_LIMIT,
    now = new Date()
} = {}) {
    const safeLimit =
        Math.min(
            1000,
            Math.max(
                1,
                Number(limit)
            )
        );

    const recoveredEvents = [];

    for (
        let index = 0;
        index < safeLimit;
        index += 1
    ) {
        const event =
            await OutboxEvent.findOneAndUpdate(
                {
                    status: "pending",
                    "dispatchLease.expiresAt": {
                        $lte: now
                    }
                },
                {
                    $set: {
                        dispatchLease: null
                    }
                },
                {
                    sort: {
                        "dispatchLease.expiresAt": 1
                    },
                    returnDocument: "after"
                }
            );

        if (!event) {
            break;
        }

        recoveredEvents.push(event);
    }

    return recoveredEvents;
}
