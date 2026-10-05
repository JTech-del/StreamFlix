"use strict";

import { randomUUID } from "node:crypto";

import Job from "../models/Job.js";

const DEFAULT_LEASE_DURATION_MS = 30_000;
const MAX_LEASE_DURATION_MS = 300_000;
const DEFAULT_RECOVERY_LIMIT = 100;

function validateJobId(jobId) {
    if (
        typeof jobId !== "string" ||
        jobId.trim().length === 0
    ) {
        const error = new Error(
            "Job ID is required."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_JOB_ID";

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
            "Dispatch lease owner is required."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_OWNER";

        throw error;
    }

    if (
        typeof owner.name !== "string" ||
        owner.name.trim().length === 0
    ) {
        const error = new Error(
            "Dispatch lease owner name is required."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_OWNER";

        throw error;
    }

    if (
        typeof owner.instanceId !== "string" ||
        owner.instanceId.trim().length === 0
    ) {
        const error = new Error(
            "Dispatch lease owner instance ID is required."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_OWNER";

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
            "Dispatch lease duration must be greater than zero."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_DURATION";

        throw error;
    }

    return Math.min(
        duration,
        MAX_LEASE_DURATION_MS
    );
}

/**
 * Atomically acquires a dispatch lease.
 *
 * A queued job can only be claimed when:
 *
 * 1. It has no active dispatch lease.
 * 2. Its current execution attempt has not already
 *    been successfully published.
 *
 * Expired leases may be reclaimed.
 *
 * The operation intentionally does not change job.status.
 */
export async function claimDispatchLease(
    jobId,
    owner,
    leaseDurationMs =
        DEFAULT_LEASE_DURATION_MS
) {
    validateJobId(jobId);
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

    const leasedJob =
        await Job.findOneAndUpdate(
            {
                jobId,
                status: "queued",

                $and: [
                    {
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
                        $or: [
                            {
                                "dispatch.status": {
                                    $ne: "published"
                                }
                            },
                            {
                                $expr: {
                                    $ne: [
                                        "$dispatch.attempt",
                                        "$attempt"
                                    ]
                                }
                            }
                        ]
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

    return leasedJob;
}

/**
 * Releases a dispatch lease only when the supplied
 * lease ID still owns the lease.
 *
 * Job status remains unchanged.
 */
export async function releaseDispatchLease(
    jobId,
    leaseId
) {
    validateJobId(jobId);

    if (
        typeof leaseId !== "string" ||
        leaseId.trim().length === 0
    ) {
        const error = new Error(
            "Dispatch lease ID is required."
        );

        error.code =
            "INVALID_DISPATCH_LEASE_ID";

        throw error;
    }

    const releasedJob =
        await Job.findOneAndUpdate(
            {
                jobId,
                status: "queued",
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

    return releasedJob;
}

/**
 * Clears expired dispatch leases.
 *
 * This operation does not change job status.
 */
export async function recoverExpiredDispatchLeases({
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

    const recoveredJobs = [];

    for (
        let index = 0;
        index < safeLimit;
        index += 1
    ) {
        const job =
            await Job.findOneAndUpdate(
                {
                    status: "queued",
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

        if (!job) {
            break;
        }

        recoveredJobs.push(job);
    }

    return recoveredJobs;
}