"use strict";

import {
    claimDispatchLease,
    releaseDispatchLease
} from "./jobDispatchLeaseService.js";

import {
    publishNotificationJob
} from "./notificationPublisher.js";

import {
    publishVideoProcessingJob
} from "./videoProcessingPublisher.js";

import Job from "../models/Job.js";

const JOB_PUBLISHERS = {
    notification: publishNotificationJob,
    "video-processing": publishVideoProcessingJob
};

const DEFAULT_DISPATCH_LEASE_DURATION_MS =
    30_000;

function getDispatcherOwner() {
    return {
        name: "job-dispatcher",
        instanceId: process.pid.toString()
    };
}

export function getJobPublisher(jobType) {
    const publisher =
        JOB_PUBLISHERS[jobType];

    if (!publisher) {
        const error = new Error(
            `No publisher registered for job type: ${jobType}`
        );

        error.code =
            "UNSUPPORTED_JOB_TYPE";

        throw error;
    }

    return publisher;
}

async function markDispatchPublished(
    jobId,
    leaseId,
    attempt,
    publishedAt
) {
    const updatedJob =
        await Job.findOneAndUpdate(
            {
                jobId,
                status: "queued",
                "dispatchLease.leaseId":
                    leaseId
            },
            {
                $set: {
                    dispatch: {
                        attempt,
                        status: "published",
                        publishedAt
                    },
                    dispatchLease: null
                }
            },
            {
                returnDocument: "after"
            }
        );

    if (!updatedJob) {
        const error =
            new Error(
                `Job dispatch outcome could not be persisted: ${jobId}`
            );

        error.code =
            "JOB_DISPATCH_FINALIZATION_FAILED";

        throw error;
    }

    return updatedJob;
}

export async function dispatchJob(
    job,
    {
        owner = getDispatcherOwner(),
        leaseDurationMs =
            DEFAULT_DISPATCH_LEASE_DURATION_MS,
        publisher = null
    } = {}
) {
    if (!job || !job.jobId) {
        const error = new Error(
            "A valid job is required for dispatch."
        );

        error.code =
            "INVALID_JOB";

        throw error;
    }

    if (job.status !== "queued") {
        const error = new Error(
            `Only queued jobs can be dispatched. Current status: ${job.status}`
        );

        error.code =
            "INVALID_JOB_DISPATCH_STATUS";

        throw error;
    }

    const resolvedPublisher =
        publisher ??
        getJobPublisher(job.type);

    const leasedJob =
        await claimDispatchLease(
            job.jobId,
            owner,
            leaseDurationMs
        );

    if (!leasedJob) {
        const error = new Error(
            `Job dispatch lease could not be acquired: ${job.jobId}`
        );

        error.code =
            "DISPATCH_LEASE_UNAVAILABLE";

        throw error;
    }

    const leaseId =
        leasedJob.dispatchLease.leaseId;

    try {
        const result =
            await resolvedPublisher(
                leasedJob
            );

        const publishedAt =
            new Date();

        await markDispatchPublished(
            leasedJob.jobId,
            leaseId,
            leasedJob.attempt,
            publishedAt
        );

        return {
            ...result,
            leaseId
        };
    } catch (error) {
        await releaseDispatchLease(
            leasedJob.jobId,
            leaseId
        );

        throw error;
    }
}