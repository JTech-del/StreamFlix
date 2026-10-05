
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
    createJob
} from "../../src/services/jobService.js";

import {
    connectRabbitMQ,
    getRabbitMQChannel,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

import {
    publishNotificationJob
} from "../../src/services/notificationPublisher.js";

import {
    startNotificationWorker
} from "../../src/workers/notificationWorker.js";

import {
    createNotificationTestQueue
} from "../helpers/rabbitmqTestQueue.js";

let mongoServer;
let channel;
let testQueue;

async function waitForCondition(
    condition,
    timeoutMs = 5000,
    intervalMs = 100
) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        const check = async () => {
            try {
                const result = await condition();

                if (result) {
                    resolve(result);
                    return;
                }

                if (Date.now() - startedAt >= timeoutMs) {
                    reject(
                        new Error(
                            "Timed out waiting for condition."
                        )
                    );

                    return;
                }

                setTimeout(check, intervalMs);
            } catch (error) {
                reject(error);
            }
        };

        check();
    });
}

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-worker-consumer-test"
        }
    );

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel =
        getRabbitMQChannel();

    testQueue =
        await createNotificationTestQueue();
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
    "notification worker automatically consumes and acknowledges RabbitMQ notification jobs",
    async () => {
        const worker =
            await startNotificationWorker({
                queueName:
                    testQueue.queueName
            });

        assert.equal(
            worker.worker,
            "notification-worker"
        );

        assert.equal(
            worker.queue,
            testQueue.queueName
        );

        assert.equal(
            worker.prefetch,
            1
        );

        const user =
            await User.create({
                email:
                    "notification-consumer@example.com",

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
                    "consumer-test-movie-1001",

                correlationId:
                    "consumer-test-event-1001",

                metadata: {
                    eventId:
                        "consumer-test-event-1001",

                    eventType:
                        "movie.published",

                    movieId:
                        "consumer-test-movie-1001",

                    movieMongoId:
                        "consumer-test-movie-1001",

                    title:
                        "Consumer Test Movie",

                    slug:
                        "consumer-test-movie",

                    recipientUserId:
                        user._id.toString()
                }
            });

    await publishNotificationJob(
    job,
    {
        exchangeName:
            testQueue.exchangeName,

        routingKey:
            testQueue.routingKey
    }
);

        const completedJob =
            await waitForCondition(
                async () => {
                    const currentJob =
                        await Job.findOne({
                            jobId:
                                job.jobId
                        });

                    return (
                        currentJob &&
                        currentJob.status ===
                            "completed"
                    )
                        ? currentJob
                        : null;
                }
            );

        assert.equal(
            completedJob.status,
            "completed"
        );

        assert.equal(
            completedJob.worker.name,
            "notification-worker"
        );

        const notification =
            await waitForCondition(
                async () => {
                    return Notification.findOne({
                        dedupeKey:
                            `movie.published:` +
                            `${job.metadata.movieId}:` +
                            `${user._id}`
                    });
                }
            );

        assert.ok(
            notification
        );

        assert.equal(
            notification.recipientUserId.toString(),
            user._id.toString()
        );

        assert.equal(
            notification.type,
            "movie.published"
        );

        assert.equal(
            notification.dedupeKey,
            `movie.published:` +
            `${job.metadata.movieId}:` +
            `${user._id}`
        );

        await waitForCondition(
            async () => {
                const remainingMessage =
                    await channel.get(
                        testQueue.queueName,
                        {
                            noAck:
                                false
                        }
                    );

                return (
                    remainingMessage ===
                    false
                );
            }
        );
    }
);
