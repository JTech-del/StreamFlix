"use strict";

import { randomUUID } from "node:crypto";

import OutboxEvent from "../models/OutboxEvent.js";

export async function createOutboxEvent({
    eventType,
    aggregateType,
    aggregateId,
    payload,
    session = null
}) {
    if (!eventType) {
        throw new Error("Outbox event type is required.");
    }

    if (!aggregateType) {
        throw new Error("Outbox aggregate type is required.");
    }

    if (!aggregateId) {
        throw new Error("Outbox aggregate ID is required.");
    }

    if (
        payload === undefined ||
        payload === null
    ) {
        throw new Error("Outbox payload is required.");
    }

    const event = new OutboxEvent({
        eventId: randomUUID(),
        eventType,
        aggregateType,
        aggregateId: String(aggregateId),
        payload,
        status: "pending",
        attempts: 0
    });

    if (session) {
        await event.save({ session });
    } else {
        await event.save();
    }

    return event;
}
