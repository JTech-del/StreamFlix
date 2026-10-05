
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
    processNotificationMessage
} from "../../src/workers/notificationWorker.js";

import {
    createNotificationTestQueue
} from "../helpers/rabbitmqTestQueue.js";


let mongoServer;
let channel;
let testQueue;


async function waitForJobCompletion(
    jobId,
    timeoutMs = 5000
) {
    const startedAt =
        Date.now();

    return new Promise(
        (resolve, reject) => {

            const check = async () => {

                try {

                    const job =
                        await Job.findOne({
                            jobId
                        });

                    if (
                        job &&
                        job.status ===
                            "completed"
                    ) {

                        resolve(job);

                        return;
                    }

                    if (
                        Date.now() -
                            startedAt >=
                        timeoutMs
                    ) {

                        reject(
                            new Error(
                                `Timed out waiting for job ${jobId} to become completed.`
                            )
                        );

                        return;
                    }

                    setTimeout(
                        check,
                        100
                    );

                } catch (error) {

                    reject(error);
                }
            };

            check();
        }
    );
}


test.before(async () => {

    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-worker-rabbitmq-test"
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
    "RabbitMQ publishes notification job and worker processes it",
    async () => {

        const user =
            await User.create({
                email:
                    "rabbitmq-notification@example.com",

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
                    "rabbitmq-movie-1001",

                correlationId:
                    "rabbitmq-event-1001",

                metadata: {

                    eventId:
                        "rabbitmq-event-1001",

                    eventType:
                        "movie.published",

                    movieId:
                        "1001",

                    movieMongoId:
                        "rabbitmq-movie-1001",

                    title:
                        "RabbitMQ Test Movie",

                    slug:
                        "rabbitmq-test-movie",

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


        const rabbitMessage =
            await channel.get(
                testQueue.queueName,
                {
                    noAck:
                        false
                }
            );


        assert.ok(
            rabbitMessage,
            "Expected RabbitMQ notification message."
        );


        const result =
            await processNotificationMessage(
                rabbitMessage
            );


        assert.equal(
            result.claimed,
            true
        );

        assert.equal(
            result.jobId,
            job.jobId
        );

        assert.ok(
            result.notificationId
        );


        channel.ack(
            rabbitMessage
        );


        const completedJob =
            await waitForJobCompletion(
                job.jobId
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
            await Notification.findOne({
                notificationId:
                    result.notificationId
            });


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
            `movie.published:1001:${user._id}`
        );


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
