"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    recoverDueJobs
} from "../../src/services/jobRecoveryService.js";

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
    "recovers a retrying job whose retry time has elapsed",
    async () => {
        const now = new Date();

        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-001",
            status: "retrying",
            attempt: 1,
            maxAttempts: 3,
            nextAttemptAt: new Date(
                now.getTime() - 1000
            ),
            startedAt: now,
            worker: {
                name: "notification-worker",
                instanceId: "old-instance"
            }
        });

        const recovered =
            await recoverDueJobs({
                now
            });

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
            recovered[0].nextAttemptAt,
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
    }
);

test(
    "does not recover a retrying job before its retry time",
    async () => {
        const now = new Date();

        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-002",
            status: "retrying",
            attempt: 1,
            maxAttempts: 3,
            nextAttemptAt: new Date(
                now.getTime() + 60000
            )
        });

        const recovered =
            await recoverDueJobs({
                now
            });

        assert.equal(
            recovered.length,
            0
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            storedJob.status,
            "retrying"
        );

        assert.ok(
            storedJob.nextAttemptAt
        );
    }
);

test(
    "does not recover completed or queued jobs",
    async () => {
        const now = new Date();

        await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-003",
            status: "completed",
            nextAttemptAt: new Date(
                now.getTime() - 1000
            )
        });

        await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-004",
            status: "queued",
            nextAttemptAt: new Date(
                now.getTime() - 1000
            )
        });

        const recovered =
            await recoverDueJobs({
                now
            });

        assert.equal(
            recovered.length,
            0
        );
    }
);

test(
    "recovers multiple due jobs in retry-time order",
    async () => {
        const now = new Date();

        const first = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-005",
            status: "retrying",
            nextAttemptAt: new Date(
                now.getTime() - 3000
            )
        });

        const second = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-006",
            status: "retrying",
            nextAttemptAt: new Date(
                now.getTime() - 2000
            )
        });

        const recovered =
            await recoverDueJobs({
                now,
                limit: 2
            });

        assert.equal(
            recovered.length,
            2
        );

        assert.equal(
            recovered[0].jobId,
            first.jobId
        );

        assert.equal(
            recovered[1].jobId,
            second.jobId
        );
    }
);

test(
    "recovery is safe against duplicate concurrent claims",
    async () => {
        const now = new Date();

        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-007",
            status: "retrying",
            attempt: 1,
            maxAttempts: 3,
            nextAttemptAt: new Date(
                now.getTime() - 1000
            )
        });

        const [
            firstRecovery,
            secondRecovery
        ] = await Promise.all([
            recoverDueJobs({
                now,
                limit: 1
            }),
            recoverDueJobs({
                now,
                limit: 1
            })
        ]);

        const totalRecovered =
            firstRecovery.length +
            secondRecovery.length;

        assert.equal(
            totalRecovered,
            1
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            storedJob.status,
            "queued"
        );
    }
);
test(
    "recoverDueJobs clears a stale dispatch lease when retrying job becomes queued",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "retrying",
                attempt: 1,
                maxAttempts: 3,
                nextAttemptAt:
                    new Date(Date.now() - 1000),
                dispatchLease: {
                    leaseId: "stale-lease-id",
                    owner: {
                        name: "job-dispatcher",
                        instanceId: "stale-instance"
                    },
                    acquiredAt:
                        new Date(Date.now() - 60000),
                    expiresAt:
                        new Date(Date.now() - 30000)
                }
            });

        const recoveredJobs =
            await recoverDueJobs();

        assert.equal(
            recoveredJobs.length,
            1
        );

        const recoveredJob =
            recoveredJobs[0];

        assert.equal(
            recoveredJob.status,
            "queued"
        );

        assert.equal(
            recoveredJob.dispatchLease,
            null
        );

        const persistedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            persistedJob.status,
            "queued"
        );

        assert.equal(
            persistedJob.dispatchLease,
            null
        );
    }
);

test(
    "recovery resets dispatch state for the new execution attempt",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "movie",
                entityId: "dispatch-reset-001",
                status: "retrying",
                attempt: 1,
                maxAttempts: 3,
                nextAttemptAt:
                    new Date(Date.now() - 1000),
                dispatch: {
                    attempt: 0,
                    status: "published",
                    publishedAt: new Date(
                        Date.now() - 5000
                    )
                }
            });

        const recovered =
            await recoverDueJobs({
                now: new Date()
            });

        assert.equal(
            recovered.length,
            1
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.dispatch.attempt,
            null
        );

        assert.equal(
            storedJob.dispatch.status,
            "pending"
        );

        assert.equal(
            storedJob.dispatch.publishedAt,
            null
        );
    }
);