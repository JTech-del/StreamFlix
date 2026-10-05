
"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import User from "../../src/models/User.js";
import Job from "../../src/models/Job.js";
import Notification from "../../src/models/Notification.js";

import {
    connectRabbitMQ,
    getRabbitMQChannel,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

import {
    createJob
} from "../../src/services/jobService.js";

import {
    publishNotificationJob
} from "../../src/services/notificationPublisher.js";

import {
    processNotificationMessage
} from "../../src/workers/notificationWorker.js";

import {
    recoverAndDispatchDueJobs
} from "../../src/services/jobRecoveryDispatcherService.js";

import {
    createNotificationTestQueue
} from "../helpers/rabbitmqTestQueue.js";

let mongoServer;
let channel;
let testQueue;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-retry-roundtrip-test"
        }
    );

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel =
        getRabbitMQChannel();

    testQueue =
        await createNotificationTestQueue();

    await Promise.all([
        User.init(),
        Job.init(),
        Notification.init()
    ]);
});

test.after(async () => {
    if (testQueue) {
        await testQueue.cleanup();
    }

    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "notification job survives failure, recovery, redispatch, and completes exactly once",
    async () => {
        const user =
            await User.create({
                email:
                    "retry-roundtrip@example.com",

                passwordHash:
                    "test-password-hash"
            });

        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "retry-roundtrip-movie",

                maxAttempts:
                    3,

                correlationId:
                    "retry-roundtrip-event",

                metadata: {
                    eventId:
                        "retry-roundtrip-event",

                    eventType:
                        "movie.published",

                    movieId:
                        "retry-roundtrip-movie",

                    movieMongoId:
                        "retry-roundtrip-movie",

                    title:
                        "Retry Roundtrip Movie",

                    slug:
                        "retry-roundtrip-movie"

                    // Intentionally missing:
                    // recipientUserId
                }
            });

        /*
         * Initial dispatch.
         */
       await publishNotificationJob(
    job,
    {
        exchangeName:
            testQueue.exchangeName,

        routingKey:
            testQueue.routingKey
    }
);

        const firstMessage =
            await channel.get(
                testQueue.queueName,
                {
                    noAck:
                        false
                }
            );

        assert.ok(
            firstMessage,
            "Expected initial notification job in RabbitMQ."
        );

        /*
         * First worker attempt must fail
         * and enter the retry state machine.
         */
        const firstResult =
            await processNotificationMessage(
                firstMessage
            );

        assert.equal(
            firstResult.claimed,
            true
        );

        assert.equal(
            firstResult.status,
            "retrying"
        );

        assert.equal(
            firstResult.attempt,
            1
        );

        assert.equal(
            firstResult.error.code,
            "MISSING_NOTIFICATION_RECIPIENT"
        );

        /*
         * The original delivery is acknowledged.
         *
         * Retry scheduling is now represented by
         * MongoDB state rather than RabbitMQ redelivery.
         */
        channel.ack(
            firstMessage
        );

        const retryingJob =
            await Job.findOne({
                jobId:
                    job.jobId
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

        /*
         * Simulate the transient failure being
         * corrected before retry.
         */
        await Job.updateOne(
            {
                jobId:
                    job.jobId
            },
            {
                $set: {
                    "metadata.recipientUserId":
                        user._id.toString(),

                    nextAttemptAt:
                        new Date(
                            Date.now() - 1000
                        )
                }
            }
        );

        /*
         * Recovery must atomically move:
         *
         * retrying → queued
         *
         * and dispatch the recovered job
         * back to RabbitMQ.
         */
      const recoveryResult =
    await recoverAndDispatchDueJobs({
        limit: 10,
        now: new Date(),
        publisher: (job) =>
            publishNotificationJob(
                job,
                {
                    exchangeName:
                        testQueue.exchangeName,

                    routingKey:
                        testQueue.routingKey
                }
            )
    });

        assert.equal(
            recoveryResult.recovered,
            1
        );

        assert.equal(
            recoveryResult.dispatched,
            1
        );

        assert.equal(
            recoveryResult.failed,
            0
        );

        const queuedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            queuedJob.status,
            "queued"
        );

        assert.equal(
            queuedJob.attempt,
            1
        );

        assert.equal(
            queuedJob.nextAttemptAt,
            null
        );

        /*
         * Verify the recovered job was
         * actually republished.
         */
        const secondMessage =
            await channel.get(
                testQueue.queueName,
                {
                    noAck:
                        false
                }
            );

        assert.ok(
            secondMessage,
            "Expected recovered notification job in RabbitMQ."
        );

        const secondPayload =
            JSON.parse(
                secondMessage.content.toString()
            );

        assert.equal(
            secondPayload.jobId,
            job.jobId
        );

        assert.equal(
            secondPayload.type,
            "notification"
        );

        /*
         * Second worker attempt should now succeed.
         */
        const secondResult =
            await processNotificationMessage(
                secondMessage
            );

        assert.equal(
            secondResult.claimed,
            true
        );

        assert.equal(
            secondResult.status,
            "completed"
        );

        assert.ok(
            secondResult.notificationId
        );

        channel.ack(
            secondMessage
        );

        const completedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            completedJob.status,
            "completed"
        );

        assert.equal(
            completedJob.attempt,
            1
        );

        assert.equal(
            completedJob.worker.name,
            "notification-worker"
        );

        /*
         * Critical idempotency assertion:
         * exactly one notification exists.
         */
        const notifications =
            await Notification.find({
                recipientUserId:
                    user._id
            }).lean();

        assert.equal(
            notifications.length,
            1
        );

        assert.equal(
            notifications[0].notificationId,
            secondResult.notificationId
        );

        assert.equal(
            notifications[0].dedupeKey,
            `movie.published:retry-roundtrip-movie:${user._id}`
        );

        /*
         * RabbitMQ must have no duplicate
         * notification delivery remaining.
         */
        const remainingMessage =
            await channel.get(
                testQueue.queueName,
                {
                    noAck:
                        false
                }
            );

        assert.equal(
            remainingMessage,
            false
        );
    }
);
