"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    getQueuedJobs
} from "../../src/services/queuedJobService.js";

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
    "returns queued jobs without a dispatch lease",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued",
                dispatchLease: null
            });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            1
        );

        assert.equal(
            jobs[0].jobId,
            job.jobId
        );
    }
);


test(
    "returns queued jobs with expired dispatch leases",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued",
                dispatchLease: {
                    leaseId: "expired-lease",
                    owner: {
                        name: "job-dispatcher",
                        instanceId: "old-instance"
                    },
                    acquiredAt:
                        new Date(Date.now() - 60000),
                    expiresAt:
                        new Date(Date.now() - 30000)
                }
            });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            1
        );

        assert.equal(
            jobs[0].jobId,
            job.jobId
        );
    }
);


test(
    "does not return queued jobs with active dispatch leases",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued",
                dispatchLease: {
                    leaseId: "active-lease",
                    owner: {
                        name: "job-dispatcher",
                        instanceId: "active-instance"
                    },
                    acquiredAt:
                        new Date(),
                    expiresAt:
                        new Date(Date.now() + 60000)
                }
            });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            0
        );

        const persistedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(
            persistedJob
        );

        assert.equal(
            persistedJob.status,
            "queued"
        );
    }
);


test(
    "does not return non-queued jobs",
    async () => {
        const statuses = [
            "processing",
            "completed",
            "failed",
            "retrying",
            "dead-lettered"
        ];

        for (const status of statuses) {
            await Job.create({
                type: "notification",
                entityType: "notification",
                status
            });
        }

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            0
        );
    }
);


test(
    "returns queued jobs in creation order",
    async () => {
        const firstJob =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued"
            });

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 5)
        );

        const secondJob =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued"
            });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            2
        );

        assert.equal(
            jobs[0].jobId,
            firstJob.jobId
        );

        assert.equal(
            jobs[1].jobId,
            secondJob.jobId
        );
    }
);


test(
    "respects the requested batch limit",
    async () => {
        const jobsToCreate = 5;

        for (
            let index = 0;
            index < jobsToCreate;
            index += 1
        ) {
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued"
            });
        }

        const jobs =
            await getQueuedJobs({
                limit: 2
            });

        assert.equal(
            jobs.length,
            2
        );
    }
);


test(
    "clamps invalid and excessive batch limits safely",
    async () => {
        await Job.create({
            type: "notification",
            entityType: "notification",
            status: "queued"
        });

        const zeroLimitJobs =
            await getQueuedJobs({
                limit: 0
            });

        assert.equal(
            zeroLimitJobs.length,
            1
        );

        const excessiveLimitJobs =
            await getQueuedJobs({
                limit: 5000
            });

        assert.equal(
            excessiveLimitJobs.length,
            1
        );
    }
);

test(
    "does not return a queued job already published for its current attempt",
    async () => {
        await Job.create({
            type: "notification",
            entityType: "notification",
            status: "queued",
            attempt: 0,
            dispatch: {
                attempt: 0,
                status: "published",
                publishedAt: new Date()
            }
        });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            0
        );
    }
);

test(
    "returns a queued job when the published dispatch belongs to a previous attempt",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued",
                attempt: 1,
                dispatch: {
                    attempt: 0,
                    status: "published",
                    publishedAt: new Date()
                }
            });

        const jobs =
            await getQueuedJobs();

        assert.equal(
            jobs.length,
            1
        );

        assert.equal(
            jobs[0].jobId,
            job.jobId
        );
    }
);