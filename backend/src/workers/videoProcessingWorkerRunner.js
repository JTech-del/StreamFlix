"use strict";

import {
    fileURLToPath
} from "node:url";

import {
    connectRabbitMQ,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../services/rabbitmqService.js";

import {
    startVideoProcessingWorker
} from "./videoProcessingWorker.js";

let shuttingDown = false;

export async function start() {
    await connectRabbitMQ();
    await assertRabbitMQTopology();

    const worker =
        await startVideoProcessingWorker();

    console.log(
        `Video processing worker started: ${worker.worker}`
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
        `Video processing worker shutting down (${signal})...`
    );

    try {
        await closeRabbitMQ();
    } catch (error) {
        console.error(
            "Video processing worker shutdown error:",
            error
        );

        process.exitCode = 1;
    }
}

const isMainModule =
    process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    process.once(
        "SIGINT",
        () => shutdown("SIGINT")
    );

    process.once(
        "SIGTERM",
        () => shutdown("SIGTERM")
    );

    start().catch(async (error) => {
        console.error(
            "Video processing worker failed to start:",
            error
        );

        try {
            await closeRabbitMQ();
        } catch {
            // Ignore cleanup errors during startup failure.
        }

        process.exitCode = 1;
    });
}