"use strict";

import Job from "../models/Job.js";

const NOTIFICATION_JOB_TYPE = "notification";

function validateJobId(jobId) {
    if (
        typeof jobId !== "string" ||
        jobId.trim().length === 0
    ) {
        const error = new Error(
            "Job ID is required."
        );

        error.code =
            "INVALID_NOTIFICATION_JOB_ID";

        throw error;
    }
}

function validateLeaseId(leaseId) {
    if (
        typeof leaseId !== "string" ||
        leaseId.trim().length === 0
    ) {
        const error = new Error(
            "Processing lease ID is required."
        );

        error.code =
            "INVALID_NOTIFICATION_PROCESSING_LEASE_ID";

        throw error;
    }
}

function buildJobError(error) {
    return {
        code:
            error?.code ??
            "JOB_FAILED",

        message:
            error?.message ??
            String(error),

        stack:
            error?.stack ??
            null,

        occurredAt:
            new Date()
    };
}

/**
 * Completes a notification job only when the supplied
 * processing lease still owns the job.
 *
 * This prevents an old worker from completing a job that
 * has already been recovered and claimed by another worker.
 */
export async function completeNotificationJob(
    jobId,
    leaseId,
    updates = {}
) {
    validateJobId(jobId);
    validateLeaseId(leaseId);

    const job =
        await Job.findOneAndUpdate(
            {
                jobId,
                type:
                    NOTIFICATION_JOB_TYPE,
                status:
                    "processing",
                "processingLease.leaseId":
                    leaseId
            },
            {
                $set: {
                    status:
                        "completed",

                    completedAt:
                        new Date(),

                    nextAttemptAt:
                        null,

                    processingLease:
                        null,

                    ...updates
                }
            },
            {
                returnDocument:
                    "after"
            }
        );

    if (!job) {
        const error =
            new Error(
                `Notification job completion ownership was lost: ${jobId}`
            );

        error.code =
            "NOTIFICATION_JOB_COMPLETION_OWNERSHIP_LOST";

        throw error;
    }

    return job;
}

/**
 * Marks a notification job failed only when the supplied
 * processing lease still owns the job.
 *
 * The processing lease is cleared when the job enters failed
 * state so the existing retry/recovery machinery can take over.
 */
export async function failNotificationJob(
    jobId,
    leaseId,
    error
) {
    validateJobId(jobId);
    validateLeaseId(leaseId);

    const job =
        await Job.findOneAndUpdate(
            {
                jobId,
                type:
                    NOTIFICATION_JOB_TYPE,
                status:
                    "processing",
                "processingLease.leaseId":
                    leaseId
            },
            {
                $set: {
                    status:
                        "failed",

                    failedAt:
                        new Date(),

                    lastError:
                        buildJobError(
                            error
                        ),

                    processingLease:
                        null
                }
            },
            {
                returnDocument:
                    "after"
            }
        );

    if (!job) {
        const ownershipError =
            new Error(
                `Notification job failure ownership was lost: ${jobId}`
            );

        ownershipError.code =
            "NOTIFICATION_JOB_FAILURE_OWNERSHIP_LOST";

        throw ownershipError;
    }

    return job;
}