"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    claimDispatchLease,
    releaseDispatchLease,
    recoverExpiredDispatchLeases
} from "../../src/services/jobDispatchLeaseService.js";

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


async function createQueuedJob(
    overrides = {}
) {
    return Job.create({
        type: "notification",
        entityType: "movie",
        entityId: "movie-dispatch-lease-001",
        status: "queued",
        ...overrides
    });
}


test(
    "acquires a dispatch lease for a queued job",
    async () => {
        const job =
            await createQueuedJob();

        const leasedJob =
            await claimDispatchLease(
                job.jobId,
                {
                    name:
                        "job-dispatcher",
                    instanceId:
                        "dispatcher-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        assert.equal(
            leasedJob.jobId,
            job.jobId
        );

        assert.equal(
            leasedJob.status,
            "queued"
        );

        assert.ok(
            leasedJob.dispatchLease
        );

        assert.ok(
            leasedJob.dispatchLease.leaseId
        );

        assert.equal(
            leasedJob.dispatchLease.owner.name,
            "job-dispatcher"
        );

        assert.equal(
            leasedJob.dispatchLease.owner.instanceId,
            "dispatcher-001"
        );

        assert.ok(
            leasedJob.dispatchLease.acquiredAt
        );

        assert.ok(
            leasedJob.dispatchLease.expiresAt
        );

        assert.ok(
            leasedJob.dispatchLease.expiresAt >
            leasedJob.dispatchLease.acquiredAt
        );
    }
);

test(
    "does not acquire a dispatch lease for a non-queued job",
    async () => {
        const nonQueuedStatuses = [
            "processing",
            "completed",
            "failed",
            "retrying",
            "dead-lettered"
        ];

        for (const status of nonQueuedStatuses) {
            const job =
                await createQueuedJob({
                    status
                });

            const leasedJob =
                await claimDispatchLease(
                    job.jobId,
                    {
                        name:
                            "job-dispatcher",
                        instanceId:
                            `dispatcher-${status}`
                    },
                    LEASE_DURATION_MS
                );

            assert.equal(
                leasedJob,
                null,
                `Expected ${status} job to reject dispatch lease`
            );
        }
    }
);

test(
    "only one concurrent dispatcher can acquire the lease",
    async () => {
        const job =
            await createQueuedJob();

        const dispatcherA = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-A"
        };

        const dispatcherB = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-B"
        };

        const results =
            await Promise.allSettled([
                claimDispatchLease(
                    job.jobId,
                    dispatcherA,
                    LEASE_DURATION_MS
                ),

                claimDispatchLease(
                    job.jobId,
                    dispatcherB,
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
                jobId: job.jobId
            });

        assert.ok(finalJob);

        assert.ok(
            finalJob.dispatchLease
        );

        const winningInstance =
            successfulClaims[0]
                .value
                .dispatchLease
                .owner
                .instanceId;

        assert.ok(
            [
                "dispatcher-A",
                "dispatcher-B"
            ].includes(winningInstance)
        );

        assert.equal(
            finalJob.dispatchLease
                .owner
                .instanceId,
            winningInstance
        );
    }
);


test(
    "active dispatch lease cannot be stolen",
    async () => {
        const job =
            await createQueuedJob();

        const firstOwner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-001"
        };

        const secondOwner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-002"
        };

        const firstLease =
            await claimDispatchLease(
                job.jobId,
                firstOwner,
                LEASE_DURATION_MS
            );

        assert.ok(firstLease);

        const secondLease =
            await claimDispatchLease(
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
                jobId: job.jobId
            });

        assert.equal(
            currentJob.dispatchLease
                .owner
                .instanceId,
            "dispatcher-001"
        );
    }
);


test(
    "expired dispatch lease can be reclaimed",
    async () => {
        const job =
            await createQueuedJob();

        const firstOwner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-001"
        };

        const secondOwner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-002"
        };

        const firstLease =
            await claimDispatchLease(
                job.jobId,
                firstOwner,
                LEASE_DURATION_MS
            );

        assert.ok(firstLease);

        await Job.updateOne(
            {
                jobId: job.jobId
            },
            {
                $set: {
                    "dispatchLease.expiresAt":
                        new Date(
                            Date.now() - 1000
                        )
                }
            }
        );

        const reclaimedLease =
            await claimDispatchLease(
                job.jobId,
                secondOwner,
                LEASE_DURATION_MS
            );

        assert.ok(
            reclaimedLease
        );

        assert.equal(
            reclaimedLease
                .dispatchLease
                .owner
                .instanceId,
            "dispatcher-002"
        );

        assert.notEqual(
            reclaimedLease
                .dispatchLease
                .leaseId,
            firstLease
                .dispatchLease
                .leaseId
        );
    }
);


test(
    "release clears a dispatch lease using the correct lease ID",
    async () => {
        const job =
            await createQueuedJob();

        const owner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-001"
        };

        const leasedJob =
            await claimDispatchLease(
                job.jobId,
                owner,
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        const releasedJob =
            await releaseDispatchLease(
                job.jobId,
                leasedJob
                    .dispatchLease
                    .leaseId
            );

        assert.ok(
            releasedJob
        );

        assert.equal(
            releasedJob.status,
            "queued"
        );

        assert.equal(
            releasedJob.dispatchLease,
            null
        );
    }
);


test(
    "cannot release a dispatch lease using the wrong lease ID",
    async () => {
        const job =
            await createQueuedJob();

        const owner = {
            name:
                "job-dispatcher",
            instanceId:
                "dispatcher-001"
        };

        const leasedJob =
            await claimDispatchLease(
                job.jobId,
                owner,
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        const releasedJob =
            await releaseDispatchLease(
                job.jobId,
                "wrong-lease-id"
            );

        assert.equal(
            releasedJob,
            null
        );

        const currentJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(
            currentJob.dispatchLease
        );

        assert.equal(
            currentJob.dispatchLease
                .leaseId,
            leasedJob
                .dispatchLease
                .leaseId
        );
    }
);


test(
    "releasing a lease does not change the job status",
    async () => {
        const job =
            await createQueuedJob();

        const leasedJob =
            await claimDispatchLease(
                job.jobId,
                {
                    name:
                        "job-dispatcher",
                    instanceId:
                        "dispatcher-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        const releasedJob =
            await releaseDispatchLease(
                job.jobId,
                leasedJob
                    .dispatchLease
                    .leaseId
            );

        assert.equal(
            releasedJob.status,
            "queued"
        );
    }
);


test(
    "recovers expired dispatch leases without changing job status",
    async () => {
        const job =
            await createQueuedJob();

        await claimDispatchLease(
            job.jobId,
            {
                name:
                    "job-dispatcher",
                instanceId:
                    "dispatcher-001"
            },
            LEASE_DURATION_MS
        );

        await Job.updateOne(
            {
                jobId: job.jobId
            },
            {
                $set: {
                    "dispatchLease.expiresAt":
                        new Date(
                            Date.now() - 1000
                        )
                }
            }
        );

        const recovered =
            await recoverExpiredDispatchLeases();

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
            recovered[0].dispatchLease,
            null
        );
    }
);


test(
    "expired lease recovery does not clear active leases",
    async () => {
        const job =
            await createQueuedJob();

        const leasedJob =
            await claimDispatchLease(
                job.jobId,
                {
                    name:
                        "job-dispatcher",
                    instanceId:
                        "dispatcher-001"
                },
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        const recovered =
            await recoverExpiredDispatchLeases();

        assert.equal(
            recovered.length,
            0
        );

        const currentJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(
            currentJob.dispatchLease
        );

        assert.equal(
            currentJob.dispatchLease
                .leaseId,
            leasedJob
                .dispatchLease
                .leaseId
        );
    }
);