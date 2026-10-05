"use strict";

import rabbitmqTopology from "../config/rabbitmqTopology.js";

import {
getRabbitMQChannel
} from "./rabbitmqService.js";

export async function publishNotificationJob(
job,
{
exchangeName =
rabbitmqTopology.exchanges.notification.name,


    routingKey =
        rabbitmqTopology.routingKeys.notification
} = {}


) {
if (!job || !job.jobId) {
const error = new Error(
"A valid notification job is required."
);


    error.code =
        "INVALID_NOTIFICATION_JOB";

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

return {
    jobId: job.jobId,
    exchange: exchangeName,
    routingKey,
    published
};


}