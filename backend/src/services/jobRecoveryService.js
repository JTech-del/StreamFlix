"use strict";

import Job from "../models/Job.js";
import { retryJob } from "./jobService.js";

const DEFAULT_RECOVERY_LIMIT = 100;

export async function recoverDueJobs({
    limit = DEFAULT_RECOVERY_LIMIT,
    now = new Date()
} = {}) {
    const numericLimit = Number(limit);

    const safeLimit =
        Number.isFinite(numericLimit) && numericLimit > 0
            ? Math.min(Math.floor(numericLimit), 1000)
            : DEFAULT_RECOVERY_LIMIT;

    const recoveredJobs = [];

    /*
     * First recover retrying jobs whose retry delay has elapsed.
     *
     * This is the existing recovery contract:
     *
     * retrying -> queued
     */
    for (let index = 0; index < safeLimit; index += 1) {
        const job =
            await Job.findOneAndUpdate(
                {
                    status: "retrying",
                    nextAttemptAt: {
                        $lte: now
                    }
                },
                {
                    $set: {
                        status: "queued",
                        nextAttemptAt: null,
                        startedAt: null,
                        worker: {
                            name: null,
                            instanceId: null
                        },
                        dispatch: {
                            attempt: null,
                            status: "pending",
                            publishedAt: null
                        },
                        dispatchLease: null
                    }
                },
                {
                    sort: {
                        nextAttemptAt: 1
                    },
                    returnDocument: "after"
                }
            );

        if (!job) {
            break;
        }

        recoveredJobs.push(job);
    }

    /*
     * Recover jobs that were left in "failed" after failJob()
     * but before retryJob() could execute.
     *
     * We deliberately do not calculate retry policy here.
     * retryJob() remains the single source of truth for:
     *
     * - retry budget
     * - attempt increment
     * - exponential backoff
     * - dispatch reset
     * - dead-lettering
     *
     * A failed job is therefore first claimed atomically by changing
     * nothing; retryJob() itself performs the authoritative atomic
     * state transition.
     */
    while (recoveredJobs.length < safeLimit) {
        const failedJob =
            await Job.findOne({
                status: "failed",
                failedAt: {
                    $lte: now
                }
            }).sort({
                failedAt: 1
            });

        if (!failedJob) {
            break;
        }

        try {
            const retryResult =
                await retryJob(
                    failedJob.jobId
                );

            /*
             * retryJob() normally returns retrying or dead-lettered.
             * Only retrying jobs are candidates for the existing
             * retrying -> queued recovery path.
             */
            if (retryResult.status === "retrying") {
                const queuedJob =
                    await Job.findOneAndUpdate(
                        {
                            jobId: retryResult.jobId,
                            status: "retrying",
                            nextAttemptAt: {
                                $lte: now
                            }
                        },
                        {
                            $set: {
                                status: "queued",
                                nextAttemptAt: null,
                                startedAt: null,
                                worker: {
                                    name: null,
                                    instanceId: null
                                },
                                dispatch: {
                                    attempt: null,
                                    status: "pending",
                                    publishedAt: null
                                },
                                dispatchLease: null
                            }
                        },
                        {
                            returnDocument: "after"
                        }
                    );

                /*
                 * The newly-created retry normally has a future
                 * nextAttemptAt, so it should remain retrying.
                 * It is therefore not added to this recovery result
                 * until its actual retry time arrives.
                 */
                if (queuedJob) {
                    recoveredJobs.push(queuedJob);
                }
            }
        } catch (error) {
            /*
             * A concurrent worker/recovery process may already have
             * moved the failed job. In that case retryJob() safely
             * rejects because the status is no longer "failed".
             *
             * Re-read the job and continue recovery rather than
             * converting the race into a fatal recovery failure.
             */
            const currentJob =
                await Job.findOne({
                    jobId: failedJob.jobId
                });

            if (
                !currentJob ||
                currentJob.status !== "failed"
            ) {
                continue;
            }

            throw error;
        }
    }

    return recoveredJobs;
}
