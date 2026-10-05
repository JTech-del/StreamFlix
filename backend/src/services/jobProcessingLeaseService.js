"use strict";

import { randomUUID } from "node:crypto";

import Job from "../models/Job.js";

const DEFAULT_LEASE_DURATION_MS = 30_000;
const MAX_LEASE_DURATION_MS = 300_000;
const DEFAULT_RECOVERY_LIMIT = 100;

const NOTIFICATION_JOB_TYPE = "notification";
const NOTIFICATION_WORKER_NAME = "notification-worker";

function validateJobId(jobId) {
    if (
        typeof jobId !== "string" ||
        jobId.trim().length === 0
    ) {
        const error = new Error(
            "Job ID is required."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_JOB_ID";

        throw error;
    }
}

function validateWorker(worker) {
    if (
        !worker ||
        typeof worker !== "object" ||
        Array.isArray(worker)
    ) {
        const error = new Error(
            "Processing lease worker is required."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_WORKER";

        throw error;
    }

    if (
        typeof worker.name !== "string" ||
        worker.name.trim().length === 0
    ) {
        const error = new Error(
            "Processing lease worker name is required."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_WORKER";

        throw error;
    }

    if (
        typeof worker.instanceId !== "string" ||
        worker.instanceId.trim().length === 0
    ) {
        const error = new Error(
            "Processing lease worker instance ID is required."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_WORKER";

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
            "Processing lease duration must be greater than zero."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_DURATION";

        throw error;
    }

    return Math.min(
        duration,
        MAX_LEASE_DURATION_MS
    );
}

function normalizeRecoveryLimit(limit) {
    const numericLimit =
        Number(limit);

    if (
        !Number.isFinite(numericLimit) ||
        numericLimit <= 0
    ) {
        return DEFAULT_RECOVERY_LIMIT;
    }

    return Math.min(
        Math.floor(numericLimit),
        1000
    );
}

/**
 * Atomically claims a queued notification job for processing.
 *
 * This service intentionally handles notification jobs only.
 * Video-processing jobs continue using the existing claimJob()
 * path because video processing can be long-running.
 */
export async function claimNotificationJob(
    jobId,
    worker = {
        name: NOTIFICATION_WORKER_NAME,
        instanceId: process.pid.toString()
    },
    leaseDurationMs =
        DEFAULT_LEASE_DURATION_MS,
    {
        now = new Date()
    } = {}
) {
    validateJobId(jobId);
    validateWorker(worker);

    const duration =
        normalizeLeaseDuration(
            leaseDurationMs
        );

    const acquiredAt =
        new Date(now);

    if (
        Number.isNaN(
            acquiredAt.getTime()
        )
    ) {
        const error = new Error(
            "Processing lease acquisition time is invalid."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_TIME";

        throw error;
    }

    const expiresAt =
        new Date(
            acquiredAt.getTime() +
            duration
        );

    const leaseId =
        randomUUID();

    const job =
        await Job.findOneAndUpdate(
            {
                jobId,
                type: NOTIFICATION_JOB_TYPE,
                status: "queued",

                $or: [
                    {
                        processingLease: null
                    },
                    {
                        "processingLease.expiresAt": {
                            $lte: acquiredAt
                        }
                    }
                ]
            },
            {
                $set: {
                    status: "processing",

                    startedAt:
                        acquiredAt,

                    worker: {
                        name:
                            worker.name.trim(),
                        instanceId:
                            worker.instanceId.trim()
                    },

                    processingLease: {
                        leaseId,

                        owner: {
                            name:
                                worker.name.trim(),
                            instanceId:
                                worker.instanceId.trim()
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

    return job;
}

/**
 * Releases a processing lease only when the supplied lease ID
 * still owns the job.
 *
 * This prevents an old worker from clearing a newer worker's lease.
 */
export async function releaseProcessingLease(
    jobId,
    leaseId
) {
    validateJobId(jobId);

    if (
        typeof leaseId !== "string" ||
        leaseId.trim().length === 0
    ) {
        const error = new Error(
            "Processing lease ID is required."
        );

        error.code =
            "INVALID_PROCESSING_LEASE_ID";

        throw error;
    }

    return Job.findOneAndUpdate(
        {
            jobId,
            type: NOTIFICATION_JOB_TYPE,
            status: "processing",
            "processingLease.leaseId":
                leaseId
        },
        {
            $set: {
                processingLease: null
            }
        },
        {
            returnDocument: "after"
        }
    );
}

/**
 * Recovers notification jobs whose processing lease has expired.
 *
 * Recovery is deliberately a processing -> queued transition.
 * It does NOT increment attempt because a crashed/stale worker
 * is not itself a business-level processing failure.
 *
 * Dispatch state is reset because the original RabbitMQ message
 * has already been consumed and must be safely republished.
 */
export async function recoverExpiredNotificationJobs({
    limit = DEFAULT_RECOVERY_LIMIT,
    now = new Date()
} = {}) {
    const safeLimit =
        normalizeRecoveryLimit(limit);

    const recoveryTime =
        new Date(now);

    if (
        Number.isNaN(
            recoveryTime.getTime()
        )
    ) {
        const error = new Error(
            "Processing recovery time is invalid."
        );

        error.code =
            "INVALID_PROCESSING_RECOVERY_TIME";

        throw error;
    }

    const recoveredJobs = [];

    for (
        let index = 0;
        index < safeLimit;
        index += 1
    ) {
        const job =
            await Job.findOneAndUpdate(
                {
                    type: NOTIFICATION_JOB_TYPE,
                    status: "processing",
                    "processingLease.expiresAt": {
                        $lte: recoveryTime
                    }
                },
                {
                    $set: {
                        status: "queued",

                        startedAt: null,

                        worker: {
                            name: null,
                            instanceId: null
                        },

                        processingLease: null,

                        dispatch: {
                            attempt: null,
                            status: "pending",
                            publishedAt: null
                        },

                        dispatchLease: null
                    }
                },
                {
                    sort: {
                        "processingLease.expiresAt": 1
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