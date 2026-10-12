"use strict";

import PaystackWebhookEvent from "../models/PaystackWebhookEvent.js";
import {
    parsePaystackWebhookPayload,
    buildPaystackWebhookEventIdentity
} from "./paystackWebhookEventIdentityService.js";

export async function ingestPaystackWebhook(rawBody) {
    const parsed = parsePaystackWebhookPayload(rawBody);

    const identity = buildPaystackWebhookEventIdentity(
        parsed,
        rawBody
    );

    try {
        const event = await PaystackWebhookEvent.create({
            eventKey: identity.eventKey,
            eventType: parsed.eventType,
            providerReference: identity.providerReference,
            providerTransactionId: identity.providerTransactionId,
            payload: parsed.payload,
            status: "received",
            receivedAt: new Date()
        });

        return {
            outcome: "received",
            event
        };
    } catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }

        const existing = await PaystackWebhookEvent.findOne({
            eventKey: identity.eventKey
        });

        if (existing) {
            return {
                outcome: "duplicate",
                event: existing
            };
        }

        // A different unique-index collision or a missing record
        // is not automatically a duplicate delivery.
        throw error;
    }
}
