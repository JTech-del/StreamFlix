"use strict";

import {
    fileURLToPath
} from "node:url";

import {
    connectDatabase
} from "../config/database.js";

import {
    connectRabbitMQ,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../services/rabbitmqService.js";

import {
    recoverDueJobs
} from "../services/jobRecoveryService.js";

import {
    runQueuedJobDispatchCycle
} from "../services/queuedJobDispatcherService.js";


const DEFAULT_INTERVAL_MS = 5000;

let running = false;
let timer = null;
let cycleInProgress = false;


function normalizeInterval(intervalMs) {

    const interval =
        Number(intervalMs);

    if (
        !Number.isFinite(interval) ||
        interval <= 0
    ) {
        throw new Error(
            "Job dispatcher interval must be greater than zero."
        );
    }

    return interval;
}


export async function runJobDispatcherCycle({
    recoveryLimit = 100,
    dispatchLimit = 100,
    now = new Date()
} = {}) {

    if (cycleInProgress) {

        return {
            skipped: true,
            reason: "cycle-in-progress"
        };
    }

    cycleInProgress = true;

    try {

        /*
         * Recovery owns only:
         *
         * retrying → queued
         *
         * It does NOT publish anything.
         */
        const recoveredJobs =
            await recoverDueJobs({
                limit: recoveryLimit,
                now
            });


        /*
         * The queued dispatcher is the single
         * publication path.
         *
         * This means recovered jobs are dispatched
         * exactly like ordinary queued jobs.
         */
        const dispatch =
            await runQueuedJobDispatchCycle({
                limit: dispatchLimit
            });


        return {
            skipped: false,

            recovery: {
                recovered:
                    recoveredJobs.length,

                jobIds:
                    recoveredJobs.map(
                        (job) => job.jobId
                    )
            },

            dispatch
        };

    } finally {

        cycleInProgress = false;

    }
}


export async function startJobDispatcherRunner({
    intervalMs = DEFAULT_INTERVAL_MS,
    recoveryLimit = 100,
    dispatchLimit = 100
} = {}) {

    if (running) {

        return {
            running: true,
            alreadyRunning: true
        };
    }


    const interval =
        normalizeInterval(
            intervalMs
        );


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
                await runJobDispatcherCycle({
                    recoveryLimit,
                    dispatchLimit
                });


            if (!result.skipped) {

                console.log(
                    "Job dispatcher cycle completed:",
                    result
                );
            }

        } catch (error) {

            console.error(
                "Job dispatcher cycle failed:",
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


export async function stopJobDispatcherRunner() {

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
            "Job dispatcher RabbitMQ shutdown error:",
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

            await stopJobDispatcherRunner();

            process.exit(0);
        }
    );


    process.once(
        "SIGTERM",
        async () => {

            await stopJobDispatcherRunner();

            process.exit(0);
        }
    );


    startJobDispatcherRunner()
        .then((result) => {

            console.log(
                "Job dispatcher runner started:",
                result
            );

        })
        .catch(async (error) => {

            console.error(
                "Job dispatcher runner failed to start:",
                error
            );


            try {

                await closeRabbitMQ();

            } catch {
                // Ignore cleanup errors.
            }


            process.exitCode = 1;
        });
}