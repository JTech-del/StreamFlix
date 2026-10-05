"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    claimNotificationJob,
    recoverExpiredNotificationJobs
} from "../../src/services/jobProcessingLeaseService.js";

import {
    completeNotificationJob,
    failNotificationJob
} from "../../src/services/notificationJobLifecycleService.js";

let mongoServer;

async function createNotificationJob(
    jobId = `notification-test-${Date.now()}-${Math.random()}`
) {
    return Job.create({
        jobId,
        type: "notification",
        entityType: "movie",
        entityId: "movie-test",
        status: "queued",
        attempt: 0,
        maxAttempts: 3,
        metadata: {
            recipientUserId: "user-test"
        }
    });
}

async function claimAs(
    jobId,
    instanceId,
    now = new Date()
) {
    return claimNotificationJob(
        jobId,
        {
            name: "notification-worker",
            instanceId
        },
        30_000,
        { now }
    );
}

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );
});

test.beforeEach(async () => {
    await Job.deleteMany({});
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test(
    "completes a notification job with the correct processing lease",
    async () => {
        const job =
            await createNotificationJob();

        const claimed =
            await claimAs(
                job.jobId,
                "worker-a"
            );

        assert.ok(claimed);
        assert.ok(
            claimed.processingLease?.leaseId
        );

        const completed =
            await completeNotificationJob(
                job.jobId,
                claimed.processingLease.leaseId
            );

        assert.equal(
            completed.status,
            "completed"
        );

        assert.equal(
            completed.processingLease,
            null
        );

        assert.ok(
            completed.completedAt
        );
    }
);

test(
    "fails a notification job with the correct processing lease",
    async () => {
        const job =
            await createNotificationJob();

        const claimed =
            await claimAs(
                job.jobId,
                "worker-a"
            );

        const failure =
            new Error(
                "Notification delivery failed."
            );

        failure.code =
            "NOTIFICATION_DELIVERY_FAILED";

        const failed =
            await failNotificationJob(
                job.jobId,
                claimed.processingLease.leaseId,
                failure
            );

        assert.equal(
            failed.status,
            "failed"
        );

        assert.equal(
            failed.processingLease,
            null
        );

        assert.equal(
            failed.lastError.code,
            "NOTIFICATION_DELIVERY_FAILED"
        );

        assert.equal(
            failed.lastError.message,
            "Notification delivery failed."
        );

        assert.ok(
            failed.failedAt
        );
    }
);

test(
    "rejects completion when the processing lease ID is wrong",
    async () => {
        const job =
            await createNotificationJob();

        const claimed =
            await claimAs(
                job.jobId,
                "worker-a"
            );

        await assert.rejects(
            () =>
                completeNotificationJob(
                    job.jobId,
                    "wrong-lease-id"
                ),
            {
                code:
                    "NOTIFICATION_JOB_COMPLETION_OWNERSHIP_LOST"
            }
        );

        const unchanged =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            unchanged.status,
            "processing"
        );

        assert.equal(
            unchanged.processingLease.leaseId,
            claimed.processingLease.leaseId
        );
    }
);

test(
    "rejects failure when the processing lease ID is wrong",
    async () => {
        const job =
            await createNotificationJob();

        const claimed =
            await claimAs(
                job.jobId,
                "worker-a"
            );

        await assert.rejects(
            () =>
                failNotificationJob(
                    job.jobId,
                    "wrong-lease-id",
                    new Error(
                        "Should not be persisted."
                    )
                ),
            {
                code:
                    "NOTIFICATION_JOB_FAILURE_OWNERSHIP_LOST"
            }
        );

        const unchanged =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            unchanged.status,
            "processing"
        );

        assert.equal(
            unchanged.processingLease.leaseId,
            claimed.processingLease.leaseId
        );
    }
);

test(
    "stale worker cannot complete a recovered and reclaimed notification job",
    async () => {
        const job =
            await createNotificationJob();

        const originalTime =
            new Date(
                "2026-01-01T00:00:00.000Z"
            );

        const firstClaim =
            await claimAs(
                job.jobId,
                "worker-a",
                originalTime
            );

        const expiredTime =
            new Date(
                "2026-01-01T00:01:00.000Z"
            );

        const recovered =
            await recoverExpiredNotificationJobs({
                now: expiredTime
            });

        assert.equal(
            recovered.length,
            1
        );

        const secondClaim =
            await claimAs(
                job.jobId,
                "worker-b",
                expiredTime
            );

        assert.ok(secondClaim);

        assert.notEqual(
            secondClaim.processingLease.leaseId,
            firstClaim.processingLease.leaseId
        );

        await assert.rejects(
            () =>
                completeNotificationJob(
                    job.jobId,
                    firstClaim.processingLease.leaseId
                ),
            {
                code:
                    "NOTIFICATION_JOB_COMPLETION_OWNERSHIP_LOST"
            }
        );

        const currentJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            currentJob.status,
            "processing"
        );

        assert.equal(
            currentJob.processingLease.leaseId,
            secondClaim.processingLease.leaseId
        );

        assert.equal(
            currentJob.worker.instanceId,
            "worker-b"
        );
    }
);

test(
    "stale worker cannot fail a recovered and reclaimed notification job",
    async () => {
        const job =
            await createNotificationJob();

        const originalTime =
            new Date(
                "2026-01-01T00:00:00.000Z"
            );

        const firstClaim =
            await claimAs(
                job.jobId,
                "worker-a",
                originalTime
            );

        const expiredTime =
            new Date(
                "2026-01-01T00:01:00.000Z"
            );

        const recovered =
            await recoverExpiredNotificationJobs({
                now: expiredTime
            });

        assert.equal(
            recovered.length,
            1
        );

        const secondClaim =
            await claimAs(
                job.jobId,
                "worker-b",
                expiredTime
            );

        await assert.rejects(
            () =>
                failNotificationJob(
                    job.jobId,
                    firstClaim.processingLease.leaseId,
                    new Error(
                        "Stale worker failure."
                    )
                ),
            {
                code:
                    "NOTIFICATION_JOB_FAILURE_OWNERSHIP_LOST"
            }
        );

        const currentJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            currentJob.status,
            "processing"
        );

        assert.equal(
            currentJob.processingLease.leaseId,
            secondClaim.processingLease.leaseId
        );

        assert.equal(
            currentJob.worker.instanceId,
            "worker-b"
        );

    assert.equal(
    currentJob.lastError.code,
    null
);

assert.equal(
    currentJob.lastError.message,
    null
);

assert.equal(
    currentJob.lastError.stack,
    null
);

assert.equal(
    currentJob.lastError.occurredAt,
    null
);
    }
);

test(
    "concurrent completion allows only one finalization",
    async () => {
        const job =
            await createNotificationJob();

        const claimed =
            await claimAs(
                job.jobId,
                "worker-a"
            );

        const leaseId =
            claimed.processingLease.leaseId;

        const results =
            await Promise.allSettled([
                completeNotificationJob(
                    job.jobId,
                    leaseId
                ),
                completeNotificationJob(
                    job.jobId,
                    leaseId
                )
            ]);

        const fulfilled =
            results.filter(
                result =>
                    result.status ===
                    "fulfilled"
            );

        const rejected =
            results.filter(
                result =>
                    result.status ===
                    "rejected"
            );

        assert.equal(
            fulfilled.length,
            1
        );

        assert.equal(
            rejected.length,
            1
        );

        assert.equal(
            rejected[0].reason.code,
            "NOTIFICATION_JOB_COMPLETION_OWNERSHIP_LOST"
        );

        const finalJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            finalJob.status,
            "completed"
        );

        assert.equal(
            finalJob.processingLease,
            null
        );
    }
);
