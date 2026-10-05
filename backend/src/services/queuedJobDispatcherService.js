"use strict";

import {
    getQueuedJobs
} from "./queuedJobService.js";

import {
    dispatchJob
} from "./jobDispatcher.js";


const DEFAULT_BATCH_SIZE = 100;


export async function runQueuedJobDispatchCycle({
    limit = DEFAULT_BATCH_SIZE,
    now = new Date()
} = {}) {

    const queuedJobs =
        await getQueuedJobs({
            limit,
            now
        });

    const results = [];

    for (const job of queuedJobs) {

        try {

            const dispatchResult =
                await dispatchJob(job);

            results.push({
                jobId: job.jobId,
                type: job.type,
                status: "dispatched",
                dispatch: dispatchResult
            });

        } catch (error) {

            results.push({
                jobId: job.jobId,
                type: job.type,
                status: "dispatch-failed",
                error: {
                    code:
                        error?.code ??
                        "JOB_DISPATCH_FAILED",

                    message:
                        error?.message ??
                        String(error)
                }
            });

        }

    }

    return {
        scanned: queuedJobs.length,

        dispatched:
            results.filter(
                (result) =>
                    result.status === "dispatched"
            ).length,

        failed:
            results.filter(
                (result) =>
                    result.status === "dispatch-failed"
            ).length,

        results
    };
}