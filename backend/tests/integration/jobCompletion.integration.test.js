"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    completeJob
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
    "completes a processing job",
    async () => {
        const job =
            await Job.create({
                type:
                    "video-processing",
                entityType: "movie",
                entityId: "9840",
                status: "processing",
                attempt: 0,
                maxAttempts: 3
            });

        const completedJob =
            await completeJob(
                job.jobId
            );

        assert.equal(
            completedJob.status,
            "completed"
        );

        assert.ok(
            completedJob.completedAt
        );

        assert.equal(
            completedJob.nextAttemptAt,
            null
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(
            storedJob
        );

        assert.equal(
            storedJob.status,
            "completed"
        );

        assert.ok(
            storedJob.completedAt
        );

        assert.equal(
            storedJob.nextAttemptAt,
            null
        );
    }
);