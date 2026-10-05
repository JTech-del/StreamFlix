"use strict";

import rabbitmqTopology from "../config/rabbitmqTopology.js";

import {
    getRabbitMQChannel
} from "../services/rabbitmqService.js";

import {
    claimNotificationJob
} from "../services/jobProcessingLeaseService.js";

import {
    completeNotificationJob,
    failNotificationJob
} from "../services/notificationJobLifecycleService.js";

import {
    retryJob
} from "../services/jobService.js";

import {
    createNotification
} from "../services/notificationService.js";

const WORKER_NAME = "notification-worker";

function parseMessage(message) {
    if (!message) {
        const error = new Error(
            "RabbitMQ message is required."
        );

        error.code =
            "INVALID_RABBITMQ_MESSAGE";

        throw error;
    }

    let payload;

    try {
        payload =
            JSON.parse(
                message.content.toString()
            );
    } catch {
        const error = new Error(
            "Invalid notification message JSON."
        );

        error.code =
            "INVALID_NOTIFICATION_MESSAGE";

        throw error;
    }

    if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {
        const error = new Error(
            "Notification message must be an object."
        );

        error.code =
            "INVALID_NOTIFICATION_MESSAGE";

        throw error;
    }

    if (!payload.jobId) {
        const error = new Error(
            "Notification message jobId is required."
        );

        error.code =
            "MISSING_NOTIFICATION_JOB_ID";

        throw error;
    }

    if (payload.type !== "notification") {
        const error = new Error(
            "Unsupported notification job type."
        );

        error.code =
            "UNSUPPORTED_NOTIFICATION_JOB";

        throw error;
    }

    return payload;
}

async function handleNotificationJobFailure(
    job,
    leaseId,
    error,
    {
        failJobOperation = failNotificationJob,
        retryJobOperation = retryJob
    } = {}
) {
    let failedJob;

    try {
        failedJob =
            await failJobOperation(
                job.jobId,
                leaseId,
                error
            );
    } catch (failureError) {
        const recoveryError =
            new Error(
                `Notification job failure could not be persisted: ${job.jobId}`
            );

        recoveryError.code =
            "NOTIFICATION_FAILURE_PERSISTENCE_FAILED";

        recoveryError.cause =
            failureError;

        throw recoveryError;
    }

    try {
        const retryResult =
            await retryJobOperation(
                failedJob.jobId
            );

        return {
            jobId:
                job.jobId,

            status:
                retryResult.status,

            attempt:
                retryResult.attempt,

            nextAttemptAt:
                retryResult.nextAttemptAt,

            lastError:
                retryResult.lastError ??
                null
        };
    } catch (retryError) {
        console.error(
            "Notification job retry scheduling failed; leaving job in failed state:",
            retryError
        );

        return {
            jobId:
                job.jobId,

            status:
                "failed",

            attempt:
                failedJob.attempt,

            nextAttemptAt:
                failedJob.nextAttemptAt ??
                null,

            lastError:
                failedJob.lastError ??
                null,

            retrySchedulingFailed:
                true
        };
    }
}

export async function processNotificationMessage(
    message,
    worker = WORKER_NAME,
    {
        claimJobOperation = claimNotificationJob,
        completeJobOperation =
            completeNotificationJob,
        failJobOperation =
            failNotificationJob,
        retryJobOperation =
            retryJob
    } = {}
) {
    const payload =
        parseMessage(message);

    const claimedJob =
        await claimJobOperation(
            payload.jobId,
            {
                name:
                    worker,
                instanceId:
                    process.pid.toString()
            }
        );

    if (!claimedJob) {
        return {
            acknowledged: true,
            claimed: false,
            jobId:
                payload.jobId
        };
    }

    const leaseId =
        claimedJob.processingLease?.leaseId;

    if (!leaseId) {
        const error =
            new Error(
                `Notification job processing lease is missing after claim: ${claimedJob.jobId}`
            );

        error.code =
            "NOTIFICATION_PROCESSING_LEASE_MISSING";

        throw error;
    }

    try {
        const metadata =
            claimedJob.metadata ?? {};

        const recipientUserId =
            metadata.recipientUserId;

        if (!recipientUserId) {
            const error =
                new Error(
                    "Notification recipient user ID is required."
                );

            error.code =
                "MISSING_NOTIFICATION_RECIPIENT";

            throw error;
        }

        if (
            metadata.eventType !==
            "movie.published"
        ) {
            const error =
                new Error(
                    "Unsupported notification event type."
                );

            error.code =
                "UNSUPPORTED_NOTIFICATION_EVENT_TYPE";

            throw error;
        }

        const movieTitle =
            metadata.title ||
            "A new movie";

        const slug =
            metadata.slug;

        const dedupeKey =
            `movie.published:${metadata.movieId}:${recipientUserId}`;

        const notification =
            await createNotification({
                recipientUserId,

                type:
                    "movie.published",

                title:
                    "New movie published",

                message:
                    `${movieTitle} is now available.`,

                link:
                    slug
                        ? `/movies/${slug}`
                        : null,

                metadata: {
                    eventId:
                        metadata.eventId ??
                        null,

                    eventType:
                        metadata.eventType ??
                        null,

                    movieId:
                        metadata.movieId ??
                        null,

                    movieMongoId:
                        metadata.movieMongoId ??
                        null,

                    slug:
                        slug ??
                        null
                },

                dedupeKey
            });

        await completeJobOperation(
            claimedJob.jobId,
            leaseId
        );

        return {
            acknowledged:
                true,

            claimed:
                true,

            jobId:
                claimedJob.jobId,

            status:
                "completed",

            notificationId:
                notification.notificationId,

            dedupeKey
        };
    } catch (error) {
        const retryResult =
            await handleNotificationJobFailure(
                claimedJob,
                leaseId,
                error,
                {
                    failJobOperation,
                    retryJobOperation
                }
            );

        return {
            acknowledged:
                true,

            claimed:
                true,

            jobId:
                claimedJob.jobId,

            status:
                retryResult.status,

            attempt:
                retryResult.attempt,

            nextAttemptAt:
                retryResult.nextAttemptAt,

            error: {
                code:
                    error?.code ??
                    "NOTIFICATION_JOB_FAILED",

                message:
                    error?.message ??
                    String(error)
            },

            retrySchedulingFailed:
                retryResult.retrySchedulingFailed ??
                false
        };
    }
}

export async function startNotificationWorker(
    {
        queueName =
            rabbitmqTopology.queues.notification.name
    } = {}
) {
    const channel =
        getRabbitMQChannel();

    await channel.prefetch(1);

    await channel.consume(
        queueName,
        async (message) => {
            if (!message) {
                return;
            }

            try {
                await processNotificationMessage(
                    message
                );

                channel.ack(message);
            } catch (error) {
                console.error(
                    "Notification worker error:",
                    error
                );

                channel.nack(
                    message,
                    false,
                    false
                );
            }
        }
    );

    return {
        worker:
            WORKER_NAME,

        queue:
            queueName,

        prefetch:
            1
    };
}
