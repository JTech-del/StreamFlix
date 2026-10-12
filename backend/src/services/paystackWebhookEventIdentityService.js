"use strict";

import { createHash } from "node:crypto";

function invalidPayload() {
    const error = new Error("Invalid Paystack webhook payload.");
    error.code = "PAYSTACK_WEBHOOK_INVALID_PAYLOAD";
    error.statusCode = 400;
    return error;
}

function hashRawBody(rawBody) {
    return createHash("sha256")
        .update(rawBody)
        .digest("hex");
}

export function parsePaystackWebhookPayload(rawBody) {
    if (!Buffer.isBuffer(rawBody)) {
        throw invalidPayload();
    }

    let payload;

    try {
        payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
        throw invalidPayload();
    }

    if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        typeof payload.event !== "string" ||
        payload.event.trim() === "" ||
        payload.event.trim().length > 100 ||
        payload.data === null ||
        typeof payload.data !== "object" ||
        Array.isArray(payload.data)
    ) {
        throw invalidPayload();
    }

    return {
        eventType: payload.event.trim(),
        data: payload.data,
        payload
    };
}

export function buildPaystackWebhookEventIdentity(
    { eventType, data },
    rawBody
) {
    if (
        typeof eventType !== "string" ||
        eventType.trim() === "" ||
        eventType.trim().length > 100 ||
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        !Buffer.isBuffer(rawBody)
    ) {
        throw invalidPayload();
    }

    const normalizedEventType = eventType.trim();
    const payloadHash = hashRawBody(rawBody);

    return {
        eventKey: `paystack:${normalizedEventType}:${payloadHash}`,
        providerReference:
            typeof data.reference === "string" &&
            data.reference.trim() !== ""
                ? data.reference.trim().slice(0, 200)
                : null,
        providerTransactionId:
            (typeof data.id === "string" &&
                data.id.trim() !== "") ||
            (typeof data.id === "number" &&
                Number.isSafeInteger(data.id) &&
                data.id >= 0)
                ? String(data.id).slice(0, 100)
                : null
    };
}
