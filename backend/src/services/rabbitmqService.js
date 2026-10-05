"use strict";

import amqp from "amqplib";
import rabbitmqConfig from "../config/rabbitmq.js";
import rabbitmqTopology from "../config/rabbitmqTopology.js";

let connection = null;
let channel = null;

export async function connectRabbitMQ() {
    if (connection && channel) {
        return {
            connection,
            channel
        };
    }

    connection = await amqp.connect(
        rabbitmqConfig.url
    );

    channel = await connection.createConfirmChannel();

    console.log("RabbitMQ connected.");

    return {
        connection,
        channel
    };
}

export function getRabbitMQChannel() {
    if (!channel) {
        throw new Error(
            "RabbitMQ channel is not initialized."
        );
    }

    return channel;
}

export async function waitForRabbitMQConfirms() {
    if (!channel) {
        throw new Error(
            "RabbitMQ channel is not initialized."
        );
    }

    await channel.waitForConfirms();
}

export async function assertRabbitMQTopology() {
    const rabbitmqChannel =
        getRabbitMQChannel();

    const exchange =
        rabbitmqTopology.exchanges.videoProcessing;

    const queue =
        rabbitmqTopology.queues.videoProcessing;

    const routingKey =
        rabbitmqTopology.routingKeys.videoProcessing;

    await rabbitmqChannel.assertExchange(
        exchange.name,
        exchange.type,
        exchange.options
    );

    await rabbitmqChannel.assertQueue(
        queue.name,
        queue.options
    );

    await rabbitmqChannel.bindQueue(
        queue.name,
        exchange.name,
        routingKey
    );

    const notificationExchange =
        rabbitmqTopology.exchanges.notification;

    const notificationQueue =
        rabbitmqTopology.queues.notification;

    const notificationRoutingKey =
        rabbitmqTopology.routingKeys.notification;

    await rabbitmqChannel.assertExchange(
        notificationExchange.name,
        notificationExchange.type,
        notificationExchange.options
    );

    await rabbitmqChannel.assertQueue(
        notificationQueue.name,
        notificationQueue.options
    );

    await rabbitmqChannel.bindQueue(
        notificationQueue.name,
        notificationExchange.name,
        notificationRoutingKey
    );

    return {
        videoProcessing: {
            exchange: exchange.name,
            queue: queue.name,
            routingKey
        },

        notification: {
            exchange: notificationExchange.name,
            queue: notificationQueue.name,
            routingKey: notificationRoutingKey
        }
    };
}

export async function closeRabbitMQ() {
    if (channel) {
        await channel.close();
        channel = null;
    }

    if (connection) {
        await connection.close();
        connection = null;
    }

    console.log(
        "RabbitMQ connection closed."
    );
}