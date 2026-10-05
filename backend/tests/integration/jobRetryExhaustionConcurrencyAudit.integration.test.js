"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
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

test(
    "AUDIT: concurrent retry calls when retry budget is exhausted",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "movie",
                entityId: "concurrency-audit-003",
                status: "failed",
                attempt: 3,
                maxAttempts: 3
            });

        const results =
            await Promise.allSettled([
                retryJob(job.jobId),
                retryJob(job.jobId)
            ]);

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        console.log(
            "Concurrent exhausted-retry results:",
            results.map((result) => ({
                status: result.status,
                value:
                    result.status === "fulfilled"
                        ? {
                            status: result.value.status,
                            attempt: result.value.attempt
                        }
                        : {
                            message:
                                result.reason?.message
                        }
            }))
        );

        console.log(
            "Final stored job:",
            {
                status: storedJob.status,
                attempt: storedJob.attempt,
                failedAt:
                    storedJob.failedAt
            }
        );

        assert.equal(
            results.length,
            2
        );
    }
);
