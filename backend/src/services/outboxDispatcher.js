"use strict";

import OutboxEvent from "../models/OutboxEvent.js";
import {
    publishVideoProcessingJob
} from "./videoProcessingPublisher.js";

const VIDEO_PROCESSING_EVENT =
    "video.processing.requested";

export async function dispatchOutboxEvent(eventId) {
    if (!eventId) {
        const error = new Error(
            "Outbox event ID is required."
        );
        error.code = "INVALID_OUTBOX_EVENT_ID";
        throw error;
    }

    const event = await OutboxEvent.findOne({
        eventId
    });

    if (!event) {
        const error = new Error(
            "Outbox event not found."
        );
        error.code = "OUTBOX_EVENT_NOT_FOUND";
        throw error;
    }

    if (event.status === "published") {
        return {
            eventId: event.eventId,
            status: event.status,
            published: false,
            alreadyPublished: true
        };
    }

    event.attempts += 1;
    event.lastAttemptAt = new Date();

    try {
        if (event.eventType !== VIDEO_PROCESSING_EVENT) {
            const error = new Error(
                `Unsupported outbox event type: ${event.eventType}`
            );
            error.code = "UNSUPPORTED_OUTBOX_EVENT_TYPE";
            throw error;
        }

        const result =
            await publishVideoProcessingJob(
                event.payload
            );

        event.status = "published";
        event.publishedAt = new Date();
        event.lastError = {
            code: null,
            message: null,
            occurredAt: null
        };

        await event.save();

        return {
            eventId: event.eventId,
            status: event.status,
            published: result.published,
            alreadyPublished: false
        };
    } catch (error) {
        event.status = "failed";
        event.lastError = {
            code: error?.code ?? "OUTBOX_DISPATCH_FAILED",
            message: error?.message ?? String(error),
            occurredAt: new Date()
        };

        await event.save();

        throw error;
    }
}
