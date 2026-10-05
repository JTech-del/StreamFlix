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

let mongoServer;
let channel;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-publisher-test"
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
});

test.after(async () => {
    if (channel) {
        await channel.purgeQueue(
            rabbitmqTopology.queues
                .notification.name
        );
    }

    await closeRabbitMQ();

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "RabbitMQ publishes notification job",
    async () => {
        const job =
            await createJob({
                type: "notification",
                entityType: "movie",
                entityId:
                    "movie-mongo-id-001",
                correlationId:
                    "movie-published-event-001",
                metadata: {
                    eventId:
                        "movie-published-event-001",
                    eventType:
                        "movie.published",
                    movieId: 9901,
                    movieMongoId:
                        "movie-mongo-id-001",
                    title:
                        "Test Movie",
                    slug:
                        "test-movie"
                }
            });

        const result =
            await publishNotificationJob(
                job
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
            rabbitmqTopology
                .exchanges
                .notification
                .name
        );

        assert.equal(
            result.routingKey,
            rabbitmqTopology
                .routingKeys
                .notification
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
            "Expected RabbitMQ notification message."
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

        assert.equal(
            payload.entityType,
            "movie"
        );

        assert.equal(
            payload.entityId,
            "movie-mongo-id-001"
        );

        assert.equal(
            payload.correlationId,
            "movie-published-event-001"
        );

        assert.equal(
            payload.metadata.title,
            "Test Movie"
        );

        assert.equal(
            message.properties.messageId,
            job.jobId
        );

        assert.equal(
            message.properties.correlationId,
            "movie-published-event-001"
        );

        assert.equal(
            message.properties.type,
            "notification"
        );

        assert.equal(
            message.properties.contentType,
            "application/json"
        );

assert.equal(
    message.properties.deliveryMode,
    2
);

        channel.ack(
            message
        );

        const remainingMessage =
            await channel.get(
                rabbitmqTopology.queues
                    .notification.name,
                {
                    noAck: false
                }
            );

        assert.equal(
            remainingMessage,
            false
        );
    }
);