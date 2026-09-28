import amqp from "amqplib";
import rabbitmqConfig from "../config/rabbitmq.js";
import rabbitmqTopology from "../config/rabbitmqTopology.js";

let connection = null;
let channel = null;

export async function connectRabbitMQ() {
    if (connection && channel) {
        return { connection, channel };
    }

    connection = await amqp.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();

    console.log("RabbitMQ connected.");

    return { connection, channel };
}

export function getRabbitMQChannel() {
    if (!channel) {
        throw new Error("RabbitMQ channel is not initialized.");
    }

    return channel;
}

export async function assertRabbitMQTopology() {
    const rabbitmqChannel = getRabbitMQChannel();

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

    return {
        exchange: exchange.name,
        queue: queue.name,
        routingKey
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

    console.log("RabbitMQ connection closed.");
}