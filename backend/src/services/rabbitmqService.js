import amqp from "amqplib";
import rabbitmqConfig from "../config/rabbitmq.js";

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