"use strict";

import {
    fileURLToPath
} from "node:url";

import {
    connectDatabase,
    disconnectDatabase
} from "../config/database.js";

import {
    connectRabbitMQ,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../services/rabbitmqService.js";

import {
    startNotificationWorker
} from "./notificationWorker.js";

let shuttingDown = false;

export async function start() {
    await connectDatabase();

    await connectRabbitMQ();

    await assertRabbitMQTopology();

    const worker =
        await startNotificationWorker();

    console.log(
        `Notification worker started: ${worker.worker}`
    );

    console.log(
        `Listening on queue: ${worker.queue}`
    );

    return worker;
}

export async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log(
        `Notification worker shutting down (${signal})...`
    );

    try {
        await closeRabbitMQ();
    } catch (error) {
        console.error(
            "Notification worker RabbitMQ shutdown error:",
            error
        );

        process.exitCode = 1;
    }

    try {
        await disconnectDatabase();
    } catch (error) {
        console.error(
            "Notification worker MongoDB shutdown error:",
            error
        );

        process.exitCode = 1;
    }
}

const isMainModule =
    process.argv[1] ===
    fileURLToPath(import.meta.url);

if (isMainModule) {
    process.once(
        "SIGINT",
        () => shutdown("SIGINT")
    );

    process.once(
        "SIGTERM",
        () => shutdown("SIGTERM")
    );

    start()
        .then((result) => {
            console.log(
                "Notification worker ready:",
                result
            );
        })
        .catch(async (error) => {
            console.error(
                "Notification worker failed to start:",
                error
            );

            try {
                await closeRabbitMQ();
            } catch {
                // Ignore RabbitMQ cleanup errors during startup failure.
            }

            try {
                await disconnectDatabase();
            } catch {
                // Ignore MongoDB cleanup errors during startup failure.
            }

            process.exitCode = 1;
        });
}
