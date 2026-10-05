"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    completeJob,
    failJob
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
    "AUDIT: concurrent completion and failure transitions",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "movie",
                entityId: "concurrency-audit-002",
                status: "processing",
                attempt: 0,
                maxAttempts: 3
            });

        const results =
            await Promise.allSettled([
                completeJob(job.jobId),
                failJob(
                    job.jobId,
                    new Error("Simulated concurrent failure")
                )
            ]);

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        console.log(
            "Concurrent completion/failure results:",
            results.map((result) => ({
                status: result.status,
                value:
                    result.status === "fulfilled"
                        ? {
                            status: result.value.status
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
                completedAt:
                    storedJob.completedAt,
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
