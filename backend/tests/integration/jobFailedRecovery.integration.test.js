"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    failJob
} from "../../src/services/jobService.js";
import {
    recoverDueJobs
} from "../../src/services/jobRecoveryService.js";

let mongoServer;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-job-failed-recovery-test"
        }
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

test(
    "recovers a failed job left behind after failJob",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "failed-recovery-001",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failed-001",
                status:
                    "processing",
                attempt:
                    0,
                maxAttempts:
                    3
            });

        await failJob(
            job.jobId,
            new Error(
                "Simulated worker crash window"
            )
        );

        const failedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            failedJob.status,
            "failed"
        );

        assert.ok(
            failedJob.failedAt
        );

        const recovered =
            await recoverDueJobs({
                now: new Date()
            });

        assert.equal(
            recovered.length,
            0
        );

        const retryingJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            retryingJob.status,
            "retrying"
        );

        assert.equal(
            retryingJob.attempt,
            1
        );

        assert.ok(
            retryingJob.nextAttemptAt
        );

        assert.ok(
            retryingJob.nextAttemptAt.getTime()
                > Date.now()
        );
    }
);

test(
    "failed recovery preserves exponential retry policy",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "failed-recovery-002",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failed-002",
                status:
                    "failed",
                attempt:
                    1,
                maxAttempts:
                    3,
                failedAt:
                    new Date(
                        Date.now() - 1000
                    )
            });

        const before =
            Date.now();

        await recoverDueJobs({
            now: new Date()
        });

        const retryingJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            retryingJob.status,
            "retrying"
        );

        assert.equal(
            retryingJob.attempt,
            2
        );

        const delay =
            retryingJob.nextAttemptAt.getTime()
            - before;

        assert.ok(
            delay >= 1500,
            `Expected approximately 2s retry delay, got ${delay}ms`
        );

        assert.ok(
            delay <= 3500,
            `Expected approximately 2s retry delay, got ${delay}ms`
        );
    }
);

test(
    "failed recovery dead-letters an exhausted job",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "failed-recovery-003",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failed-003",
                status:
                    "failed",
                attempt:
                    3,
                maxAttempts:
                    3,
                failedAt:
                    new Date(
                        Date.now() - 1000
                    )
            });

        const recovered =
            await recoverDueJobs({
                now: new Date()
            });

        assert.equal(
            recovered.length,
            0
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "dead-lettered"
        );

        assert.equal(
            storedJob.attempt,
            3
        );
    }
);

test(
    "concurrent failed-job recovery only creates one retry",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "failed-recovery-004",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failed-004",
                status:
                    "failed",
                attempt:
                    0,
                maxAttempts:
                    3,
                failedAt:
                    new Date(
                        Date.now() - 1000
                    )
            });

        const results =
            await Promise.all([
                recoverDueJobs({
                    now: new Date()
                }),
                recoverDueJobs({
                    now: new Date()
                })
            ]);

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "retrying"
        );

        assert.equal(
            storedJob.attempt,
            1
        );

        const totalRecovered =
            results.reduce(
                (
                    total,
                    result
                ) =>
                    total +
                    result.length,
                0
            );

        assert.equal(
            totalRecovered,
            0
        );
    }
);

test(
    "recovery does not alter an already retrying job",
    async () => {
        const nextAttemptAt =
            new Date(
                Date.now() + 60000
            );

        const job =
            await Job.create({
                jobId:
                    "failed-recovery-005",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failed-005",
                status:
                    "retrying",
                attempt:
                    1,
                maxAttempts:
                    3,
                nextAttemptAt
            });

        await recoverDueJobs({
            now: new Date()
        });

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "retrying"
        );

        assert.equal(
            storedJob.attempt,
            1
        );

        assert.equal(
            storedJob.nextAttemptAt.getTime(),
            nextAttemptAt.getTime()
        );
    }
);
