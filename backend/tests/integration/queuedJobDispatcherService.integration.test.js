"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    runQueuedJobDispatchCycle
} from "../../src/services/queuedJobDispatcherService.js";

import {
    connectRabbitMQ,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

let mongoServer;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );

    await connectRabbitMQ();
    await assertRabbitMQTopology();
});

test.after(async () => {
    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await Job.deleteMany({});
});


test(
    "dispatches queued notification jobs",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "queued"
            });

        const result =
            await runQueuedJobDispatchCycle();

        assert.equal(
            result.scanned,
            1
        );

        assert.equal(
            result.dispatched,
            1
        );

        assert.equal(
            result.failed,
            0
        );

        assert.equal(
            result.results.length,
            1
        );

        assert.equal(
            result.results[0].jobId,
            job.jobId
        );

        assert.equal(
            result.results[0].status,
            "dispatched"
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
    "dispatches multiple queued jobs in one cycle",
    async () => {
        const firstJob =
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "queued"
            });

        const secondJob =
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "queued"
            });

        const result =
            await runQueuedJobDispatchCycle();

        assert.equal(
            result.scanned,
            2
        );

        assert.equal(
            result.dispatched,
            2
        );

        assert.equal(
            result.failed,
            0
        );

        assert.deepEqual(
            result.results.map(
                (item) => item.jobId
            ),
            [
                firstJob.jobId,
                secondJob.jobId
            ]
        );
    }
);


test(
    "respects the dispatch batch limit",
    async () => {
        for (
            let index = 0;
            index < 3;
            index += 1
        ) {
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "queued"
            });
        }

        const result =
            await runQueuedJobDispatchCycle({
                limit: 2
            });

        assert.equal(
            result.scanned,
            2
        );

        assert.equal(
            result.dispatched,
            2
        );

        assert.equal(
            result.failed,
            0
        );

        assert.equal(
    result.results.length,
    2
);
      const remainingJobs =
    await Job.countDocuments({
        status: "queued"
    });

assert.equal(
    remainingJobs,
    3
);
    }
);


test(
    "does not dispatch non-queued jobs",
    async () => {
        await Job.create({
            type: "notification",
            entityType: "notification",
            status: "processing"
        });

        await Job.create({
            type: "notification",
            entityType: "notification",
            status: "completed"
        });

        await Job.create({
            type: "notification",
            entityType: "notification",
            status: "failed"
        });

        const result =
            await runQueuedJobDispatchCycle();

        assert.equal(
            result.scanned,
            0
        );

        assert.equal(
            result.dispatched,
            0
        );

        assert.equal(
            result.failed,
            0
        );
    }
);


test(
    "reports unsupported job types without stopping the cycle",
    async () => {
        const unsupportedJob =
            await Job.create({
                type: "unsupported-job-type",
                entityType: "test",
                status: "queued"
            });

        const validJob =
            await Job.create({
                type: "notification",
                entityType: "notification",
                entityId:
                    new mongoose.Types.ObjectId().toString(),
                status: "queued"
            });

        const result =
            await runQueuedJobDispatchCycle();

        assert.equal(
            result.scanned,
            2
        );

        assert.equal(
            result.dispatched,
            1
        );

        assert.equal(
            result.failed,
            1
        );

        const failedResult =
            result.results.find(
                (item) =>
                    item.jobId ===
                    unsupportedJob.jobId
            );

        assert.equal(
            failedResult.status,
            "dispatch-failed"
        );

        assert.equal(
            failedResult.error.code,
            "UNSUPPORTED_JOB_TYPE"
        );

        const successfulResult =
            result.results.find(
                (item) =>
                    item.jobId ===
                    validJob.jobId
            );

        assert.equal(
            successfulResult.status,
            "dispatched"
        );
    }
);


test(
    "active dispatch leases are not dispatched",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType: "notification",
                status: "queued",
                dispatchLease: {
                    leaseId: "active-lease",
                    owner: {
                        name: "another-dispatcher",
                        instanceId: "instance-1"
                    },
                    acquiredAt:
                        new Date(),
                    expiresAt:
                        new Date(
                            Date.now() + 60000
                        )
                }
            });

        const result =
            await runQueuedJobDispatchCycle();

        assert.equal(
            result.scanned,
            0
        );

        assert.equal(
            result.dispatched,
            0
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
            persistedJob.dispatchLease.leaseId,
            "active-lease"
        );
    }
);

test(
    "does not redispatch a job already published for the current attempt",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType:
                    "notification",
                entityId:
                    new mongoose.Types.ObjectId()
                        .toString(),
                status: "queued",
                attempt: 0
            });

        const firstResult =
            await runQueuedJobDispatchCycle();

        assert.equal(
            firstResult.dispatched,
            1
        );

        const storedAfterFirst =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedAfterFirst
                .dispatch.attempt,
            0
        );

        assert.equal(
            storedAfterFirst
                .dispatch.status,
            "published"
        );

        const secondResult =
            await runQueuedJobDispatchCycle();

        assert.equal(
            secondResult.scanned,
            0
        );

        assert.equal(
            secondResult.dispatched,
            0
        );

        const storedAfterSecond =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedAfterSecond
                .dispatch.attempt,
            0
        );

        assert.equal(
            storedAfterSecond
                .dispatch.status,
            "published"
        );
    }
);

test(
    "allows a new dispatch after a retry creates a new execution attempt",
    async () => {
        const job =
            await Job.create({
                type: "notification",
                entityType:
                    "notification",
                entityId:
                    new mongoose.Types.ObjectId()
                        .toString(),
                status: "queued",
                attempt: 0
            });

        await runQueuedJobDispatchCycle();

        let stored =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            stored.dispatch.attempt,
            0
        );

        stored.status = "failed";
        await stored.save();

        const { retryJob } =
            await import(
                "../../src/services/jobService.js"
            );

        await retryJob(
            job.jobId
        );

        stored =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            stored.attempt,
            1
        );

        assert.equal(
            stored.dispatch.status,
            "pending"
        );

        assert.equal(
            stored.dispatch.attempt,
            null
        );
    }
);