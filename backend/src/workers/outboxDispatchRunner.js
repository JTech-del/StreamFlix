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
    runOutboxDispatchCycle
} from "../services/outboxDispatchRunnerService.js";


const DEFAULT_INTERVAL_MS = 5000;

let running = false;
let timer = null;


function normalizeInterval(intervalMs) {

    const interval =
        Number(intervalMs);

    if (
        !Number.isFinite(interval) ||
        interval <= 0
    ) {
        throw new Error(
            "Outbox dispatcher interval must be greater than zero."
        );
    }

    return interval;
}


export async function startOutboxDispatchRunner({
    intervalMs = DEFAULT_INTERVAL_MS,
    batchSize = 50
} = {}) {

    if (running) {

        return {
            running: true,
            alreadyRunning: true
        };
    }


    const interval =
        normalizeInterval(intervalMs);


    await connectDatabase();

    await connectRabbitMQ();

    await assertRabbitMQTopology();


    running = true;


    const runCycle = async () => {

        if (!running) {
            return;
        }


        try {

            const result =
                await runOutboxDispatchCycle({
                    batchSize
                });


            console.log(
                "Outbox dispatcher cycle completed:",
                result
            );

        } catch (error) {

            console.error(
                "Outbox dispatcher cycle failed:",
                error
            );
        }


        if (!running) {
            return;
        }


        timer = setTimeout(
            runCycle,
            interval
        );
    };


    await runCycle();


    return {
        running: true,
        intervalMs: interval
    };
}


export async function stopOutboxDispatchRunner() {

    if (!running) {

        return {
            running: false,
            alreadyStopped: true
        };
    }


    running = false;


    if (timer) {

        clearTimeout(timer);

        timer = null;
    }


    try {

        await closeRabbitMQ();

    } catch (error) {

        console.error(
            "Outbox dispatcher RabbitMQ shutdown error:",
            error
        );
    }


    try {

        await disconnectDatabase();

    } catch (error) {

        console.error(
            "Outbox dispatcher MongoDB shutdown error:",
            error
        );
    }


    return {
        running: false
    };
}


const isMainModule =
    process.argv[1] ===
    fileURLToPath(import.meta.url);


if (isMainModule) {

    process.once(
        "SIGINT",
        async () => {

            await stopOutboxDispatchRunner();

            process.exit(0);
        }
    );


    process.once(
        "SIGTERM",
        async () => {

            await stopOutboxDispatchRunner();

            process.exit(0);
        }
    );


    startOutboxDispatchRunner()
        .then((result) => {

            console.log(
                "Outbox dispatcher runner started:",
                result
            );

        })
        .catch(async (error) => {

            console.error(
                "Outbox dispatcher runner failed to start:",
                error
            );


            try {
                await closeRabbitMQ();
            } catch {
                // Ignore cleanup errors.
            }


            try {
                await disconnectDatabase();
            } catch {
                // Ignore cleanup errors.
            }


            process.exitCode = 1;
        });
}
