"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import rabbitmqTopology from "../../src/config/rabbitmqTopology.js";

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
    publishVideoProcessingJob
} from "../../src/services/videoProcessingPublisher.js";

import {
    dispatchJob
} from "../../src/services/jobDispatcher.js";

let mongoServer;
let channel;

let notificationTestExchange;
let notificationTestRoutingKey;
let notificationTestQueue;

let videoTestExchange;
let videoTestRoutingKey;
let videoTestQueue;

async function createTestRoute(
    prefix
) {
    const id = randomUUID();

    const exchange =
        `streamflix.job-dispatch.test.${prefix}.${id}`;

    const routingKey =
        `job-dispatch.test.${prefix}.${id}`;

    const queue =
        `streamflix.job-dispatch.test.${prefix}.${id}`;

    await channel.assertExchange(
        exchange,
        "direct",
        {
            durable: false,
            autoDelete: true
        }
    );

    await channel.assertQueue(
        queue,
        {
            durable: false,
            exclusive: true,
            autoDelete: true
        }
    );

    await channel.bindQueue(
        queue,
        exchange,
        routingKey
    );

    return {
        exchange,
        routingKey,
        queue
    };
}

async function cleanupTestRoute(route) {
    if (!route) {
        return;
    }

    try {
        await channel.deleteQueue(
            route.queue
        );
    } catch {
        // Queue may already have been
        // removed automatically.
    }

    try {
        await channel.deleteExchange(
            route.exchange
        );
    } catch {
        // Exchange may already have been
        // removed automatically.
    }
}

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-job-dispatcher-test"
        }
    );

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel =
        getRabbitMQChannel();

    const notificationRoute =
        await createTestRoute(
            "notification"
        );

    notificationTestExchange =
        notificationRoute.exchange;

    notificationTestRoutingKey =
        notificationRoute.routingKey;

    notificationTestQueue =
        notificationRoute.queue;

    const videoRoute =
        await createTestRoute(
            "video"
        );

    videoTestExchange =
        videoRoute.exchange;

    videoTestRoutingKey =
        videoRoute.routingKey;

    videoTestQueue =
        videoRoute.queue;
});

test.after(async () => {
    await cleanupTestRoute({
        exchange:
            notificationTestExchange,
        routingKey:
            notificationTestRoutingKey,
        queue:
            notificationTestQueue
    });

    await cleanupTestRoute({
        exchange:
            videoTestExchange,
        routingKey:
            videoTestRoutingKey,
        queue:
            videoTestQueue
    });

    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "dispatches a queued notification job to RabbitMQ",
    async () => {
        const job =
            await createJob({
                type: "notification",
                entityType: "movie",
                entityId:
                    "movie-dispatch-notification",
                correlationId:
                    "dispatch-test-notification"
            });

        const notificationPublisher =
            (queuedJob) =>
                publishNotificationJob(
                    queuedJob,
                    {
                        exchangeName:
                            notificationTestExchange,
                        routingKey:
                            notificationTestRoutingKey
                    }
                );

        const result =
            await dispatchJob(
                job,
                {
                    publisher:
                        notificationPublisher
                }
            );

        assert.equal(
            result.jobId,
            job.jobId
        );

        assert.equal(
            result.published,
            true
        );

        assert.equal(
            result.exchange,
            notificationTestExchange
        );

        assert.equal(
            result.routingKey,
            notificationTestRoutingKey
        );

        const message =
            await channel.get(
                notificationTestQueue,
                {
                    noAck: false
                }
            );

        assert.ok(
            message,
            "Expected notification job in RabbitMQ."
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
    "dispatches a queued video-processing job to RabbitMQ",
    async () => {
        const job =
            await createJob({
                type: "video-processing",
                entityType: "movie",
                entityId:
                    "movie-dispatch-video",
                correlationId:
                    "dispatch-test-video"
            });

        const videoPublisher =
            (queuedJob) =>
                publishVideoProcessingJob(
                    queuedJob,
                    {
                        exchangeName:
                            videoTestExchange,
                        routingKey:
                            videoTestRoutingKey
                    }
                );

        const result =
            await dispatchJob(
                job,
                {
                    publisher:
                        videoPublisher
                }
            );

        assert.equal(
            result.jobId,
            job.jobId
        );

        assert.equal(
            result.published,
            true
        );

        assert.equal(
            result.exchange,
            videoTestExchange
        );

        assert.equal(
            result.routingKey,
            videoTestRoutingKey
        );

        const message =
            await channel.get(
                videoTestQueue,
                {
                    noAck: false
                }
            );

        assert.ok(
            message,
            "Expected video processing job in RabbitMQ."
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