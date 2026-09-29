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
    publishVideoProcessingJob
} from "../../src/services/videoProcessingPublisher.js";

import {
    processVideoProcessingMessage
} from "../../src/workers/videoProcessingWorker.js";

let mongoServer;
let channel;

function waitForJobProcessing(
    jobId,
    timeoutMs = 5000
) {
    const startedAt = Date.now();

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
                        job.status === "processing"
                    ) {
                        resolve(job);
                        return;
                    }

                    if (
                        Date.now() - startedAt >=
                        timeoutMs
                    ) {
                        reject(
                            new Error(
                                `Timed out waiting for job ${jobId} to become processing.`
                            )
                        );
                        return;
                    }

                    setTimeout(check, 100);
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
                "streamflix-worker-rabbitmq-test"
        }
    );

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel = getRabbitMQChannel();

    await channel.purgeQueue(
        rabbitmqTopology.queues
            .videoProcessing.name
    );
});

test.after(async () => {
    if (channel) {
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
    "RabbitMQ publishes video job and worker claims it",
    async () => {
        const job = await createJob({
            type: "video-processing",
            entityType: "movie",
            entityId: "9901",
            metadata: {
                movieId: 9901,
                sourceFilename:
                    "movie-001.mp4"
            }
        });

        const message = {
            jobId: job.jobId,
            type: job.type,
            entityType: job.entityType,
            entityId: job.entityId,
            correlationId:
                job.correlationId,
            metadata: job.metadata
        };

        await publishVideoProcessingJob(
            message
        );

        const rabbitMessage =
            await channel.get(
                rabbitmqTopology.queues
                    .videoProcessing.name,
                {
                    noAck: false
                }
            );

        assert.ok(
            rabbitMessage,
            "Expected RabbitMQ message."
        );

        const result =
            await processVideoProcessingMessage(
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

        assert.equal(
            result.status,
            "processing"
        );

        channel.ack(rabbitMessage);

        const processedJob =
            await waitForJobProcessing(
                job.jobId
            );

        assert.equal(
            processedJob.status,
            "processing"
        );

        assert.equal(
            processedJob.worker.name,
            "video-processing-worker"
        );

        const remainingMessage =
            await channel.get(
                rabbitmqTopology.queues
                    .videoProcessing.name,
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