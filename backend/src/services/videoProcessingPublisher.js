"use strict";

import rabbitmqTopology from "../config/rabbitmqTopology.js";

import {
    getRabbitMQChannel,
    waitForRabbitMQConfirms
} from "./rabbitmqService.js";

export async function publishVideoProcessingJob(
    job,
    {
        exchangeName =
            rabbitmqTopology.exchanges
                .videoProcessing.name,
        routingKey =
            rabbitmqTopology.routingKeys
                .videoProcessing
    } = {}
) {
    if (!job || !job.jobId) {
        const error = new Error(
            "A valid video processing job is required."
        );

        error.code =
            "INVALID_VIDEO_PROCESSING_JOB";

        throw error;
    }

    const channel =
        getRabbitMQChannel();

    const message = {
        jobId: job.jobId,
        type: job.type,
        entityType: job.entityType,
        entityId: job.entityId,
        correlationId: job.correlationId,
        metadata: job.metadata ?? {}
    };

    const published =
        channel.publish(
            exchangeName,
            routingKey,
            Buffer.from(
                JSON.stringify(message)
            ),
            {
                persistent: true,
                contentType:
                    "application/json",
                messageId:
                    job.jobId,
                correlationId:
                    job.correlationId ??
                    job.jobId,
                type: job.type
            }
        );

    if (!published) {
        const error = new Error(
            "RabbitMQ publisher buffer is full."
        );

        error.code =
            "RABBITMQ_PUBLISH_BUFFER_FULL";

        throw error;
    }

    await waitForRabbitMQConfirms();

    return {
        jobId: job.jobId,
        exchange: exchangeName,
        routingKey,
        published
    };
}