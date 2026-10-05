"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    claimNotificationJob,
    releaseProcessingLease,
    recoverExpiredNotificationJobs
} from "../../src/services/jobProcessingLeaseService.js";

let mongoServer;

const LEASE_DURATION_MS = 30_000;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await Job.deleteMany({});
});


async function createQueuedNotificationJob(
    overrides = {}
) {
    return Job.create({
        type: "notification",

        entityType:
            "movie",

        entityId:
            "movie-notification-001",

        status:
            "queued",

        attempt:
            0,

        maxAttempts:
            3,

        dispatch: {
            attempt: null,
            status: "pending",
            publishedAt: null
        },

        ...overrides
    });
}


test(
    "acquires a processing lease for a queued notification job",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "worker-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(
            leasedJob
        );

        assert.equal(
            leasedJob.jobId,
            job.jobId
        );

        assert.equal(
            leasedJob.status,
            "processing"
        );

        assert.equal(
            leasedJob.worker.name,
            "notification-worker"
        );

        assert.equal(
            leasedJob.worker.instanceId,
            "worker-001"
        );

        assert.ok(
            leasedJob.processingLease
        );

        assert.ok(
            leasedJob.processingLease.leaseId
        );

        assert.equal(
            leasedJob.processingLease.owner.name,
            "notification-worker"
        );

        assert.equal(
            leasedJob.processingLease.owner.instanceId,
            "worker-001"
        );

        assert.ok(
            leasedJob.processingLease.acquiredAt
        );

        assert.ok(
            leasedJob.processingLease.expiresAt
        );

        assert.ok(
            leasedJob.processingLease.expiresAt >
            leasedJob.processingLease.acquiredAt
        );
    }
);


test(
    "does not acquire a processing lease for a non-queued job",
    async () => {
        const nonQueuedStatuses = [
            "processing",
            "completed",
            "failed",
            "retrying",
            "dead-lettered"
        ];

        for (
            const status of nonQueuedStatuses
        ) {
            const job =
                await createQueuedNotificationJob({
                    status
                });

            const leasedJob =
                await claimNotificationJob(
                    job.jobId,
                    {
                        name:
                            "notification-worker",
                        instanceId:
                            `worker-${status}`
                    },
                    LEASE_DURATION_MS
                );

            assert.equal(
                leasedJob,
                null,
                `Expected ${status} job to reject processing lease`
            );
        }
    }
);


test(
    "does not acquire a processing lease for a non-notification job",
    async () => {
        const job =
            await Job.create({
                type:
                    "video-processing",

                entityType:
                    "movie",

                entityId:
                    "video-processing-001",

                status:
                    "queued"
            });

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "notification-worker-001"
                },
                LEASE_DURATION_MS
            );

        assert.equal(
            leasedJob,
            null
        );
    }
);


test(
    "only one concurrent notification worker can acquire the processing lease",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const workerA = {
            name:
                "notification-worker",
            instanceId:
                "worker-A"
        };

        const workerB = {
            name:
                "notification-worker",
            instanceId:
                "worker-B"
        };

        const results =
            await Promise.allSettled([
                claimNotificationJob(
                    job.jobId,
                    workerA,
                    LEASE_DURATION_MS
                ),

                claimNotificationJob(
                    job.jobId,
                    workerB,
                    LEASE_DURATION_MS
                )
            ]);

        const fulfilled =
            results.filter(
                (result) =>
                    result.status ===
                    "fulfilled"
            );

        const successfulClaims =
            fulfilled.filter(
                (result) =>
                    result.value !== null
            );

        const rejected =
            results.filter(
                (result) =>
                    result.status ===
                    "rejected"
            );

        assert.equal(
            successfulClaims.length,
            1
        );

        assert.equal(
            rejected.length,
            0
        );

        const finalJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });

        assert.ok(
            finalJob
        );

        assert.equal(
            finalJob.status,
            "processing"
        );

        assert.ok(
            finalJob.processingLease
        );

        const winningInstance =
            successfulClaims[0]
                .value
                .processingLease
                .owner
                .instanceId;

        assert.ok(
            [
                "worker-A",
                "worker-B"
            ].includes(
                winningInstance
            )
        );

        assert.equal(
            finalJob
                .processingLease
                .owner
                .instanceId,
            winningInstance
        );
    }
);


test(
    "active processing lease cannot be stolen",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const firstOwner = {
            name:
                "notification-worker",
            instanceId:
                "worker-001"
        };

        const secondOwner = {
            name:
                "notification-worker",
            instanceId:
                "worker-002"
        };

        const firstLease =
            await claimNotificationJob(
                job.jobId,
                firstOwner,
                LEASE_DURATION_MS
            );

        assert.ok(
            firstLease
        );

        const secondLease =
            await claimNotificationJob(
                job.jobId,
                secondOwner,
                LEASE_DURATION_MS
            );

        assert.equal(
            secondLease,
            null
        );

        const currentJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });

        assert.equal(
            currentJob
                .processingLease
                .owner
                .instanceId,
            "worker-001"
        );
    }
);


test(
    "expired processing lease can be reclaimed",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const firstOwner = {
            name:
                "notification-worker",
            instanceId:
                "worker-001"
        };

        const secondOwner = {
            name:
                "notification-worker",
            instanceId:
                "worker-002"
        };

        const firstLease =
            await claimNotificationJob(
                job.jobId,
                firstOwner,
                LEASE_DURATION_MS
            );

        assert.ok(
            firstLease
        );

        await Job.updateOne(
            {
                jobId:
                    job.jobId
            },
            {
                $set: {
                    "processingLease.expiresAt":
                        new Date(
                            Date.now() - 1000
                        )
                }
            }
        );

        const recovered =
            await recoverExpiredNotificationJobs();

        assert.equal(
            recovered.length,
            1
        );

        assert.equal(
            recovered[0].status,
            "queued"
        );

        assert.equal(
            recovered[0].processingLease,
            null
        );

        const reclaimedLease =
            await claimNotificationJob(
                job.jobId,
                secondOwner,
                LEASE_DURATION_MS
            );

        assert.ok(
            reclaimedLease
        );

        assert.equal(
            reclaimedLease.status,
            "processing"
        );

        assert.equal(
            reclaimedLease
                .processingLease
                .owner
                .instanceId,
            "worker-002"
        );

        assert.notEqual(
            reclaimedLease
                .processingLease
                .leaseId,
            firstLease
                .processingLease
                .leaseId
        );
    }
);


test(
    "release clears a processing lease using the correct lease ID",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "worker-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(
            leasedJob
        );

        const releasedJob =
            await releaseProcessingLease(
                job.jobId,
                leasedJob
                    .processingLease
                    .leaseId
            );

        assert.ok(
            releasedJob
        );

        assert.equal(
            releasedJob.status,
            "processing"
        );

        assert.equal(
            releasedJob.processingLease,
            null
        );
    }
);


test(
    "cannot release a processing lease using the wrong lease ID",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "worker-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(
            leasedJob
        );

        const releasedJob =
            await releaseProcessingLease(
                job.jobId,
                "wrong-lease-id"
            );

        assert.equal(
            releasedJob,
            null
        );

        const currentJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });

        assert.ok(
            currentJob.processingLease
        );

        assert.equal(
            currentJob
                .processingLease
                .leaseId,
            leasedJob
                .processingLease
                .leaseId
        );
    }
);


test(
    "expired notification processing jobs are recovered",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "worker-dead"
                },
                LEASE_DURATION_MS
            );

        assert.ok(
            leasedJob
        );

        await Job.updateOne(
            {
                jobId:
                    job.jobId
            },
            {
                $set: {
                    "processingLease.expiresAt":
                        new Date(
                            Date.now() - 1000
                        ),

                    "dispatch.status":
                        "published",

                    "dispatch.attempt":
                        0,

                    "dispatch.publishedAt":
                        new Date()
                }
            }
        );

        const recovered =
            await recoverExpiredNotificationJobs();

        assert.equal(
            recovered.length,
            1
        );

        assert.equal(
            recovered[0].jobId,
            job.jobId
        );

        assert.equal(
            recovered[0].status,
            "queued"
        );

        assert.equal(
            recovered[0].processingLease,
            null
        );

        assert.equal(
            recovered[0].startedAt,
            null
        );

        assert.equal(
            recovered[0].worker.name,
            null
        );

        assert.equal(
            recovered[0].worker.instanceId,
            null
        );

        assert.equal(
            recovered[0].dispatch.status,
            "pending"
        );

        assert.equal(
            recovered[0].dispatch.attempt,
            null
        );

        assert.equal(
            recovered[0].dispatch.publishedAt,
            null
        );

        assert.equal(
            recovered[0].dispatchLease,
            null
        );

        assert.equal(
            recovered[0].attempt,
            0
        );
    }
);


test(
    "expired lease recovery does not recover active notification jobs",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const leasedJob =
            await claimNotificationJob(
                job.jobId,
                {
                    name:
                        "notification-worker",
                    instanceId:
                        "worker-active"
                },
                LEASE_DURATION_MS
            );

        assert.ok(
            leasedJob
        );

        const recovered =
            await recoverExpiredNotificationJobs();

        assert.equal(
            recovered.length,
            0
        );

        const currentJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });

        assert.equal(
            currentJob.status,
            "processing"
        );

        assert.ok(
            currentJob.processingLease
        );

        assert.equal(
            currentJob
                .processingLease
                .leaseId,
            leasedJob
                .processingLease
                .leaseId
        );
    }
);