"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    dispatchJob
} from "../../src/services/jobDispatcher.js";

import {
    connectRabbitMQ,
    getRabbitMQChannel,
    assertRabbitMQTopology,
    closeRabbitMQ
} from "../../src/services/rabbitmqService.js";

import rabbitmqTopology from "../../src/config/rabbitmqTopology.js";

let mongoServer;

const LEASE_DURATION_MS = 30_000;

const DISPATCHER_A = {
    name: "job-dispatcher",
    instanceId: "dispatcher-A"
};

const DISPATCHER_B = {
    name: "job-dispatcher",
    instanceId: "dispatcher-B"
};


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

    const channel =
        getRabbitMQChannel();

    await channel.purgeQueue(
        rabbitmqTopology.queues.notification.name
    );
});


async function createQueuedNotificationJob(
    overrides = {}
) {
    return Job.create({
        type: "notification",
        entityType: "movie",
        entityId: "movie-dispatch-test",
        status: "queued",
        ...overrides
    });
}


test(
    "successful dispatch releases the dispatch lease and keeps job queued",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const result =
            await dispatchJob(
                job,
                {
                    owner: DISPATCHER_A,
                    leaseDurationMs:
                        LEASE_DURATION_MS
                }
            );

        assert.ok(result);

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.dispatchLease,
            null
        );
    }
);


test(
    "successful dispatch records and returns the lease ID before releasing it",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const result =
            await dispatchJob(
                job,
                {
                    owner: DISPATCHER_A,
                    leaseDurationMs:
                        LEASE_DURATION_MS
                }
            );

        assert.ok(
            result.leaseId
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.dispatchLease,
            null
        );
    }
);


test(
    "active dispatch lease prevents a second dispatcher from publishing",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const firstLease =
            await import(
                "../../src/services/jobDispatchLeaseService.js"
            );

        const leasedJob =
            await firstLease.claimDispatchLease(
                job.jobId,
                DISPATCHER_A,
                LEASE_DURATION_MS
            );

        assert.ok(leasedJob);

        await assert.rejects(
            () =>
                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_B,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                ),
            {
                code:
                    "DISPATCH_LEASE_UNAVAILABLE"
            }
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.ok(
            storedJob.dispatchLease
        );

        assert.equal(
            storedJob.dispatchLease
                .owner
                .instanceId,
            DISPATCHER_A.instanceId
        );
    }
);


test(
    "concurrent dispatchers cannot both acquire the dispatch lease",
    async () => {
        const job =
            await createQueuedNotificationJob();

        const results =
            await Promise.allSettled([
                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_A,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                ),

                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_B,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                )
            ]);

        const fulfilled =
            results.filter(
                (result) =>
                    result.status ===
                    "fulfilled"
            );

        const rejected =
            results.filter(
                (result) =>
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
            "DISPATCH_LEASE_UNAVAILABLE"
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.dispatchLease,
            null
        );
    }
);


test(
    "publisher failure releases the dispatch lease and leaves job queued",
    async () => {
        const job =
            await createQueuedNotificationJob();

        await closeRabbitMQ();

        await assert.rejects(
            () =>
                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_A,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                )
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.dispatchLease,
            null
        );

        await connectRabbitMQ();

        await assertRabbitMQTopology();
    }
);


test(
    "unsupported job type does not acquire a dispatch lease",
    async () => {
        const job =
            await createQueuedNotificationJob({
                type: "unsupported-job-type"
            });

        await assert.rejects(
            () =>
                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_A,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                ),
            {
                code:
                    "UNSUPPORTED_JOB_TYPE"
            }
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.dispatchLease,
            null
        );
    }
);


test(
    "non-queued job does not acquire a dispatch lease",
    async () => {
        const job =
            await createQueuedNotificationJob({
                status: "processing"
            });

        await assert.rejects(
            () =>
                dispatchJob(
                    job,
                    {
                        owner: DISPATCHER_A,
                        leaseDurationMs:
                            LEASE_DURATION_MS
                    }
                ),
            {
                code:
                    "INVALID_JOB_DISPATCH_STATUS"
            }
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(storedJob);

        assert.equal(
            storedJob.status,
            "processing"
        );

        assert.equal(
            storedJob.dispatchLease,
            null
        );
    }
);