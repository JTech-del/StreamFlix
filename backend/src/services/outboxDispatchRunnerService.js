"use strict";

import OutboxEvent from "../models/OutboxEvent.js";

import {
    dispatchOutboxEvent
} from "./outboxDispatcher.js";

import {
    getOutboxEventHandler
} from "./outboxEventHandler.js";

import {
    recoverExpiredOutboxDispatchLeases
} from "./outboxDispatchLeaseService.js";

import {
    recoverDueOutboxEvents
} from "./outboxRecoveryService.js";

const VIDEO_PROCESSING_EVENT =
    "video.processing.requested";

const DEFAULT_BATCH_SIZE = 50;

function normalizeBatchSize(batchSize) {
    const value = Number(batchSize);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return DEFAULT_BATCH_SIZE;
    }

    return Math.min(
        Math.floor(value),
        500
    );
}

export async function dispatchPendingOutboxEvent(
    event
) {
    if (!event?.eventId) {
        const error = new Error(
            "A valid Outbox event is required."
        );

        error.code =
            "INVALID_OUTBOX_EVENT";

        throw error;
    }

    if (
        event.eventType ===
        VIDEO_PROCESSING_EVENT
    ) {
        return dispatchOutboxEvent(
            event.eventId
        );
    }

    const handler =
        getOutboxEventHandler(
            event.eventType
        );

    if (!handler) {
        const error = new Error(
            `No Outbox handler registered for event type: ${event.eventType}`
        );

        error.code =
            "UNSUPPORTED_OUTBOX_EVENT_TYPE";

        throw error;
    }

    return handler(event);
}

export async function runOutboxDispatchCycle({
    batchSize = DEFAULT_BATCH_SIZE
} = {}) {
    const safeBatchSize =
        normalizeBatchSize(batchSize);

    const recoveredLeaseEvents =
        await recoverExpiredOutboxDispatchLeases();

    const recoveredRetryEvents =
        await recoverDueOutboxEvents({
            limit: safeBatchSize
        });

    const pendingEvents =
        await OutboxEvent.find({
            status: "pending",
            $or: [
                {
                    dispatchLease: null
                },
                {
                    "dispatchLease.expiresAt": {
                        $lte: new Date()
                    }
                }
            ]
        })
            .sort({
                createdAt: 1
            })
            .limit(safeBatchSize);

    const results = [];

    for (const event of pendingEvents) {
        try {
            const result =
                await dispatchPendingOutboxEvent(
                    event
                );

            results.push({
                eventId: event.eventId,
                eventType: event.eventType,
                success: true,
                result
            });
        } catch (error) {
            results.push({
                eventId: event.eventId,
                eventType: event.eventType,
                success: false,
                error: {
                    code:
                        error?.code ??
                        "OUTBOX_DISPATCH_FAILED",

                    message:
                        error?.message ??
                        String(error)
                }
            });
        }
    }

    return {
        recoveredCount:
            recoveredLeaseEvents.length,

        recoveredRetryCount:
            recoveredRetryEvents.length,

        scannedCount:
            pendingEvents.length,

        results
    };
}
