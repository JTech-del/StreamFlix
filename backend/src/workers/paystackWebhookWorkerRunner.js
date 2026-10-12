
"use strict";

import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
    connectDatabase,
    disconnectDatabase
} from "../config/database.js";

import {
    processNextPaystackWebhookEvent
} from "./paystackWebhookWorker.js";

const WORKER_NAME = "paystack-webhook-worker";
const DEFAULT_POLL_INTERVAL_MS = 1000;

let stopRequested = false;
let loopPromise = null;
let shutdownPromise = null;

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function runLoop({
    instanceId,
    pollIntervalMs
}) {
    while (!stopRequested) {
        try {
            const result = await processNextPaystackWebhookEvent({
                workerName: WORKER_NAME,
                instanceId
            });

            if (result.outcome === "idle") {
                await sleep(pollIntervalMs);
                continue;
            }

            if (
                result.outcome ===
                "retry_waiting_for_lease_expiry"
            ) {
                console.warn(
                    "Paystack webhook will be retried after lease expiry:",
                    result
                );

                await sleep(pollIntervalMs);
                continue;
            }

            if (result.outcome === "reconciliation_required") {
                console.error(
                    "Paystack webhook requires reconciliation:",
                    result
                );
            } else {
                console.info(
                    "Paystack webhook processed:",
                    result
                );
            }
        } catch (error) {
            console.error(
                "Paystack webhook worker iteration failed:",
                error
            );

            await sleep(pollIntervalMs);
        }
    }
}

export async function start({
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
} = {}) {
    if (
        !Number.isSafeInteger(pollIntervalMs) ||
        pollIntervalMs < 100 ||
        pollIntervalMs > 60_000
    ) {
        throw new Error(
            "pollIntervalMs must be between 100 and 60000 milliseconds."
        );
    }

    if (loopPromise) {
        throw new Error(
            "Paystack webhook worker is already running."
        );
    }

    await connectDatabase();

    stopRequested = false;
    shutdownPromise = null;

    const instanceId = `${process.pid}-${randomUUID()}`;

    loopPromise = runLoop({
        instanceId,
        pollIntervalMs
    });

    return {
        worker: WORKER_NAME,
        instanceId,
        pollIntervalMs
    };
}

export async function shutdown(signal = "shutdown") {
    if (shutdownPromise) {
        return shutdownPromise;
    }

    stopRequested = true;

    shutdownPromise = (async () => {
        console.log(
            `Paystack webhook worker shutting down (${signal})...`
        );

        if (loopPromise) {
            await loopPromise;
            loopPromise = null;
        }

        await disconnectDatabase();
    })();

    return shutdownPromise;
}

const isMainModule =
    process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    process.once("SIGINT", () => {
        shutdown("SIGINT").catch(error => {
            console.error(
                "Paystack webhook worker shutdown failed:",
                error
            );
            process.exitCode = 1;
        });
    });

    process.once("SIGTERM", () => {
        shutdown("SIGTERM").catch(error => {
            console.error(
                "Paystack webhook worker shutdown failed:",
                error
            );
            process.exitCode = 1;
        });
    });

    start()
        .then(result => {
            console.info(
                "Paystack webhook worker ready:",
                result
            );
        })
        .catch(async error => {
            console.error(
                "Paystack webhook worker failed to start:",
                error
            );

            try {
                await disconnectDatabase();
            } catch {
                // Preserve the original startup failure.
            }

            process.exitCode = 1;
        });
}
