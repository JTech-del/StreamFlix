"use strict";

import Job from "../models/Job.js";
import { createJob } from "./jobService.js";
import {
    streamActiveRecipientUserIds
} from "./notificationRecipientService.js";

const NOTIFICATION_JOB_PREFIX =
    "notification:";

function buildNotificationJobId(
    eventId,
    recipientUserId
) {
    return (
        `${NOTIFICATION_JOB_PREFIX}` +
        `${eventId}:` +
        `${recipientUserId}`
    );
}

async function createRecipientNotificationJob(
    event,
    recipientUserId
) {
    const payload =
        event.payload ?? {};

    const jobId =
        buildNotificationJobId(
            event.eventId,
            recipientUserId
        );

    try {
        return {
            job: await createJob({
                jobId,

                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    payload.movieMongoId ??
                    event.aggregateId,

                maxAttempts:
                    3,

                correlationId:
                    event.eventId,

                metadata: {
                    eventId:
                        event.eventId,

                    eventType:
                        event.eventType,

                    movieId:
                        payload.movieId ?? null,

                    movieMongoId:
                        payload.movieMongoId ??
                        event.aggregateId,

                    title:
                        payload.title ?? null,

                    slug:
                        payload.slug ?? null,

                    recipientUserId
                }
            }),

            created: true
        };
    } catch (error) {
        const duplicateJobId =
            error?.code === 11000 &&
            (
                error?.keyPattern?.jobId === 1 ||
                error?.keyValue?.jobId === jobId
            );

        if (duplicateJobId) {
            const existingJob =
                await Job.findOne({
                    jobId
                });

            if (existingJob) {
                return {
                    job: existingJob,
                    created: false
                };
            }
        }

        throw error;
    }
}

export async function createMoviePublishedNotificationJobs(
    event
) {
    if (!event?.eventId) {
        const error = new Error(
            "Outbox event is required."
        );

        error.code =
            "INVALID_NOTIFICATION_OUTBOX_EVENT";

        throw error;
    }

    if (
        event.eventType !==
        "movie.published"
    ) {
        const error = new Error(
            "Unsupported notification event type."
        );

        error.code =
            "UNSUPPORTED_NOTIFICATION_EVENT_TYPE";

        throw error;
    }

    let createdCount = 0;
    let existingCount = 0;
    let totalRecipients = 0;

    for await (
        const recipientUserId
        of streamActiveRecipientUserIds()
    ) {
        totalRecipients += 1;

        const result =
            await createRecipientNotificationJob(
                event,
                recipientUserId
            );

        if (result.created) {
            createdCount += 1;
        } else {
            existingCount += 1;
        }
    }

    return {
        eventId: event.eventId,
        totalRecipients,
        createdCount,
        existingCount
    };
}
