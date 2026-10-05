"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import rabbitmqTopology from "../../src/config/rabbitmqTopology.js";

import {
    connectRabbitMQ,
    getRabbitMQChannel,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

import {
    recoverAndDispatchDueJobs
} from "../../src/services/jobRecoveryDispatcherService.js";

let mongoServer;
let channel;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-job-recovery-dispatcher-test"
        }
    );

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel =
        getRabbitMQChannel();

    await channel.purgeQueue(
        rabbitmqTopology.queues
            .notification.name
    );

    await channel.purgeQueue(
        rabbitmqTopology.queues
            .videoProcessing.name
    );
});

test.after(async () => {
    if (channel) {
        await channel.purgeQueue(
            rabbitmqTopology.queues
                .notification.name
        );

        await channel.purgeQueue(
            rabbitmqTopology.queues
                .videoProcessing.name
        );
    }

    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "recovers and dispatches a due notification job",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "retry-dispatch-notification-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-retry-1",
                status:
                    "retrying",
                attempt:
                    1,
                maxAttempts:
                    3,
                nextAttemptAt:
                    new Date(
                        Date.now() - 1000
                    ),
                correlationId:
                    "retry-dispatch-notification"
            });

        const result =
            await recoverAndDispatchDueJobs({
                now: new Date()
            });

        assert.equal(
            result.recovered,
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
            result.results[0].jobId,
            job.jobId
        );

        assert.equal(
            result.results[0].status,
            "dispatched"
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "queued"
        );

        assert.equal(
            storedJob.nextAttemptAt,
            null
        );

        const message =
            await channel.get(
                rabbitmqTopology.queues
                    .notification.name,
                {
                    noAck: false
                }
            );

        assert.ok(
            message,
            "Expected recovered notification job in RabbitMQ."
        );

        const payload =
            JSON.parse(
                message.content.toString()
            );

        assert.equal(
            payload.jobId,
            job.jobId
        );

        assert.equal(
            payload.type,
            "notification"
        );

        channel.ack(message);
    }
);

test(
    "recovers and dispatches a due video-processing job",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "retry-dispatch-video-1",
                type:
                    "video-processing",
                entityType:
                    "movie",
                entityId:
                    "movie-video-retry-1",
                status:
                    "retrying",
                attempt:
                    2,
                maxAttempts:
                    3,
                nextAttemptAt:
                    new Date(
                        Date.now() - 1000
                    ),
                correlationId:
                    "retry-dispatch-video"
            });

        const result =
            await recoverAndDispatchDueJobs({
                now: new Date()
            });

        assert.equal(
            result.recovered,
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

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "queued"
        );

        const message =
            await channel.get(
                rabbitmqTopology.queues
                    .videoProcessing.name,
                {
                    noAck: false
                }
            );

        assert.ok(
            message,
            "Expected recovered video job in RabbitMQ."
        );

        const payload =
            JSON.parse(
                message.content.toString()
            );

        assert.equal(
            payload.jobId,
            job.jobId
        );

        assert.equal(
            payload.type,
            "video-processing"
        );

        channel.ack(message);
    }
);

test(
    "does not recover a retrying job before its retry time",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "retry-dispatch-future-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-future-1",
                status:
                    "retrying",
                attempt:
                    1,
                maxAttempts:
                    3,
                nextAttemptAt:
                    new Date(
                        Date.now() + 60000
                    )
            });

        const result =
            await recoverAndDispatchDueJobs({
                now: new Date()
            });

        assert.equal(
            result.recovered,
            0
        );

        assert.equal(
            result.dispatched,
            0
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "retrying"
        );
    }
);

test(
    "does not recover completed or queued jobs",
    async () => {
        await Job.create({
            jobId:
                "retry-dispatch-completed-1",
            type:
                "notification",
            entityType:
                "movie",
            status:
                "completed",
            attempt:
                1,
            maxAttempts:
                3,
            nextAttemptAt:
                new Date(
                    Date.now() - 1000
                )
        });

        await Job.create({
            jobId:
                "retry-dispatch-queued-1",
            type:
                "notification",
            entityType:
                "movie",
            status:
                "queued",
            attempt:
                1,
            maxAttempts:
                3,
            nextAttemptAt:
                new Date(
                    Date.now() - 1000
                )
        });

        const result =
            await recoverAndDispatchDueJobs({
                now: new Date()
            });

        assert.equal(
            result.recovered,
            0
        );

        assert.equal(
            result.dispatched,
            0
        );
    }
);

test(
    "reports dispatch failure without falsely changing the job to processing",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "retry-dispatch-invalid-1",
                type:
                    "unsupported-job-type",
                entityType:
                    "movie",
                status:
                    "retrying",
                attempt:
                    1,
                maxAttempts:
                    3,
                nextAttemptAt:
                    new Date(
                        Date.now() - 1000
                    )
            });

        const result =
            await recoverAndDispatchDueJobs({
                now: new Date()
            });

        assert.equal(
            result.recovered,
            1
        );

        assert.equal(
            result.dispatched,
            0
        );

        assert.equal(
            result.failed,
            1
        );

        assert.equal(
            result.results[0].status,
            "dispatch-failed"
        );

        assert.equal(
            result.results[0].error.code,
            "UNSUPPORTED_JOB_TYPE"
        );

        const storedJob =
            await Job.findOne({
                jobId: job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "queued"
        );
    }
);
