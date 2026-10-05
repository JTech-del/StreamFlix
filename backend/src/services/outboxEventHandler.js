"use strict";

import OutboxEvent from "../models/OutboxEvent.js";

import {
    createMoviePublishedNotificationJobs
} from "./notificationOrchestrationService.js";

import {
    claimOutboxDispatchLease,
    releaseOutboxDispatchLease
} from "./outboxDispatchLeaseService.js";

const MOVIE_PUBLISHED_EVENT =
    "movie.published";

const DISPATCHER_OWNER = {
    name: "outbox-event-handler",
    instanceId: process.pid.toString()
};

const RETRYABLE_BACKOFF_BASE_MS = 1000;
const RETRYABLE_BACKOFF_MAX_MS = 60000;

const TERMINAL_ERROR_CODES = new Set([
    "UNSUPPORTED_OUTBOX_EVENT_TYPE",
    "INVALID_OUTBOX_EVENT",
    "OUTBOX_EVENT_NOT_FOUND"
]);

function calculateRetryDelay(attempt) {
    const safeAttempt = Math.max(
        1,
        Number(attempt) || 1
    );

    return Math.min(
        RETRYABLE_BACKOFF_BASE_MS *
            (2 ** (safeAttempt - 1)),
        RETRYABLE_BACKOFF_MAX_MS
    );
}

function isRetryableOutboxError(error) {
    return !TERMINAL_ERROR_CODES.has(
        error?.code
    );
}

function getNextAttemptAt(
    attempts,
    maxAttempts,
    error
) {
    if (
        !isRetryableOutboxError(error) ||
        attempts >= maxAttempts
    ) {
        return null;
    }

    return new Date(
        Date.now() +
        calculateRetryDelay(attempts)
    );
}

async function finalizeSuccessfulDispatch(
    eventId,
    leaseId
) {
    return OutboxEvent.findOneAndUpdate(
        {
            eventId,
            status: "pending",
            "dispatchLease.leaseId": leaseId
        },
        {
            $set: {
                status: "published",
                publishedAt: new Date(),
                nextAttemptAt: null,
                lastError: {
                    code: null,
                    message: null,
                    occurredAt: null
                },
                dispatchLease: null
            }
        },
        {
            returnDocument: "after"
        }
    );
}

async function finalizeFailedDispatch(
    eventId,
    leaseId,
    error,
    attempts,
    maxAttempts
) {
    const nextAttemptAt =
        getNextAttemptAt(
            attempts,
            maxAttempts,
            error
        );

    return OutboxEvent.findOneAndUpdate(
        {
            eventId,
            status: "pending",
            "dispatchLease.leaseId": leaseId
        },
        {
            $set: {
                status: "failed",
                nextAttemptAt,
                lastError: {
                    code:
                        error?.code ??
                        "OUTBOX_EVENT_HANDLER_FAILED",
                    message:
                        error?.message ??
                        String(error),
                    occurredAt: new Date()
                },
                dispatchLease: null
            }
        },
        {
            returnDocument: "after"
        }
    );
}

export async function handleMoviePublishedOutboxEvent(
    event,
    {
        createNotificationJobs =
            createMoviePublishedNotificationJobs
    } = {}
) {
    if (!event?.eventId) {
        const error = new Error(
            "Outbox event is required."
        );

        error.code =
            "INVALID_OUTBOX_EVENT";

        throw error;
    }

    if (
        event.eventType !==
        MOVIE_PUBLISHED_EVENT
    ) {
        const error = new Error(
            `Unsupported outbox event type: ${event.eventType}`
        );

        error.code =
            "UNSUPPORTED_OUTBOX_EVENT_TYPE";

        throw error;
    }

    if (event.status === "published") {
        return {
            eventId: event.eventId,
            status: "published",
            published: false,
            alreadyPublished: true
        };
    }

    const leasedEvent =
        await claimOutboxDispatchLease(
            event.eventId,
            DISPATCHER_OWNER
        );

    if (!leasedEvent) {
        const error = new Error(
            "Outbox event dispatch lease is unavailable."
        );

        error.code =
            "OUTBOX_DISPATCH_LEASE_UNAVAILABLE";

        throw error;
    }

    const leaseId =
        leasedEvent.dispatchLease.leaseId;

    leasedEvent.attempts += 1;
    leasedEvent.lastAttemptAt = new Date();

    await leasedEvent.save();

    try {
        const result =
            await createNotificationJobs(
                leasedEvent
            );

        const finalized =
            await finalizeSuccessfulDispatch(
                leasedEvent.eventId,
                leaseId
            );

        if (!finalized) {
            const error = new Error(
                "Outbox event could not be finalized after successful notification orchestration."
            );

            error.code =
                "OUTBOX_DISPATCH_FINALIZATION_FAILED";

            throw error;
        }

        return {
            eventId: finalized.eventId,
            status: finalized.status,
            published: true,
            alreadyPublished: false,
            ...result
        };
    } catch (error) {
        const finalized =
            await finalizeFailedDispatch(
                leasedEvent.eventId,
                leaseId,
                error,
                leasedEvent.attempts,
                leasedEvent.maxAttempts
            );

        if (!finalized) {
            await releaseOutboxDispatchLease(
                leasedEvent.eventId,
                leaseId
            );
        }

        throw error;
    }
}

export function getOutboxEventHandler(
    eventType
) {
    if (
        eventType ===
        MOVIE_PUBLISHED_EVENT
    ) {
        return handleMoviePublishedOutboxEvent;
    }

    return null;
}

export {
    calculateRetryDelay,
    isRetryableOutboxError
};
