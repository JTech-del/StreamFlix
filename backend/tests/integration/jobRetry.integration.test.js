"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    failJob,
    retryJob
} from "../../src/services/jobService.js";

let mongoServer;

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

test(
    "failed job enters retrying state with incremented attempt",
    async () => {
        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-retry-001",
            status: "processing",
            attempt: 0,
            maxAttempts: 3
        });

        await failJob(
            job.jobId,
            new Error("Temporary failure")
        );

        const retryingJob =
            await retryJob(job.jobId);

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
    "retry delay increases exponentially",
    async () => {
        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-retry-002",
            status: "failed",
            attempt: 0,
            maxAttempts: 5
        });

        const firstRetry =
            await retryJob(job.jobId);

        const firstDelay =
            firstRetry.nextAttemptAt.getTime()
            - Date.now();

        assert.ok(
            firstDelay >= 900
        );

        assert.ok(
            firstDelay <= 2000
        );

        await Job.updateOne(
            {
                jobId: job.jobId
            },
            {
                $set: {
                    status: "failed"
                }
            }
        );

        const secondRetry =
            await retryJob(job.jobId);

        const secondDelay =
            secondRetry.nextAttemptAt.getTime()
            - Date.now();

        assert.ok(
            secondRetry.attempt === 2
        );

        assert.ok(
            secondDelay >= 1900
        );

        assert.ok(
            secondDelay <= 3000
        );
    }
);

test(
    "job is dead-lettered when retry budget is exhausted",
    async () => {
        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-retry-003",
            status: "failed",
            attempt: 3,
            maxAttempts: 3
        });

        const result =
            await retryJob(job.jobId);

        assert.equal(
            result.status,
            "dead-lettered"
        );

        assert.equal(
            result.attempt,
            3
        );
    }
);

test(
    "retryJob rejects a job that is not failed",
    async () => {
        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-retry-004",
            status: "processing",
            attempt: 0,
            maxAttempts: 3
        });

        await assert.rejects(
            () => retryJob(job.jobId),
            /Invalid job transition/
        );
    }
);
