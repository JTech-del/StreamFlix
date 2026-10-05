"use strict";

import { randomUUID } from "node:crypto";

import {
getRabbitMQChannel
} from "../../src/services/rabbitmqService.js";

export async function createNotificationTestQueue() {
const channel =
getRabbitMQChannel();


const id =
    randomUUID();

const exchangeName =
    `streamflix.notification.test.${id}`;

const routingKey =
    `notification.test.${id}`;

const queueName =
    `streamflix.notification.test.${id}`;

await channel.assertExchange(
    exchangeName,
    "direct",
    {
        durable: false,
        autoDelete: true
    }
);

await channel.assertQueue(
    queueName,
    {
        durable: false,
        exclusive: true,
        autoDelete: true
    }
);

await channel.bindQueue(
    queueName,
    exchangeName,
    routingKey
);

return {
    exchangeName,
    routingKey,
    queueName,

    async cleanup() {
        try {
            await channel.deleteQueue(
                queueName
            );
        } catch {
            // Queue may already have been deleted.
        }

        try {
            await channel.deleteExchange(
                exchangeName
            );
        } catch {
            // Exchange may already have been deleted.
        }
    }
};


}

