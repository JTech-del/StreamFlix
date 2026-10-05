"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    connectRabbitMQ,
    getRabbitMQChannel,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

import rabbitmqTopology from "../../src/config/rabbitmqTopology.js";

let channel;

test.before(async () => {
    await connectRabbitMQ();

    await assertRabbitMQTopology();

    channel = getRabbitMQChannel();

    await channel.purgeQueue(
        rabbitmqTopology.queues.notification.name
    );
});

test.after(async () => {
    if (channel) {
        await channel.purgeQueue(
            rabbitmqTopology.queues.notification.name
        );
    }

    await closeRabbitMQ();
});

test(
    "RabbitMQ asserts notification exchange and queue",
    async () => {
        const exchange =
            rabbitmqTopology.exchanges.notification;

        const queue =
            rabbitmqTopology.queues.notification;

        const routingKey =
            rabbitmqTopology.routingKeys.notification;

        const exchangeCheck =
            await channel.checkExchange(
                exchange.name
            );

        assert.ok(
            exchangeCheck,
            "Notification exchange should exist."
        );

        const queueCheck =
            await channel.checkQueue(
                queue.name
            );

        assert.equal(
            queueCheck.queue,
            queue.name
        );

        const publishResult =
            channel.publish(
                exchange.name,
                routingKey,
                Buffer.from(
                    JSON.stringify({
                        jobId:
                            "notification-topology-test"
                    })
                ),
                {
                    persistent: true,
                    contentType:
                        "application/json",
                    messageId:
                        "notification-topology-test"
                }
            );

        assert.equal(
            publishResult,
            true
        );

        const message =
            await channel.get(
                queue.name,
                {
                    noAck: false
                }
            );

        assert.ok(
            message,
            "Expected notification message."
        );

        const payload =
            JSON.parse(
                message.content.toString()
            );

        assert.equal(
            payload.jobId,
            "notification-topology-test"
        );

        channel.ack(message);

        const remainingMessage =
            await channel.get(
                queue.name,
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