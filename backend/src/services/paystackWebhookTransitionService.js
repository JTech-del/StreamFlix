"use strict";

import PaystackWebhookEvent from "../models/PaystackWebhookEvent.js";

function transitionError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function validateLeaseInput({ eventId, leaseId, now }) {
    if (
        typeof eventId !== "string" ||
        !/^[a-f\d]{24}$/i.test(eventId)
    ) {
        throw transitionError(
            "A valid webhook event ID is required.",
            "PAYSTACK_WEBHOOK_INVALID_EVENT_ID"
        );
    }

    if (
        typeof leaseId !== "string" ||
        leaseId.trim() === "" ||
        leaseId.length > 100
    ) {
        throw transitionError(
            "A valid webhook lease ID is required.",
            "PAYSTACK_WEBHOOK_INVALID_LEASE_ID"
        );
    }

    if (
        !(now instanceof Date) ||
        !Number.isFinite(now.getTime())
    ) {
        throw transitionError(
            "A valid transition timestamp is required.",
            "PAYSTACK_WEBHOOK_INVALID_TIMESTAMP"
        );
    }
}

function validateErrorDetails(details) {
    if (
        !details ||
        typeof details.code !== "string" ||
        details.code.trim() === "" ||
        details.code.trim().length > 100 ||
        typeof details.message !== "string" ||
        details.message.trim() === "" ||
        details.message.trim().length > 500
    ) {
        throw transitionError(
            "A valid, sanitized error code and message are required.",
            "PAYSTACK_WEBHOOK_INVALID_ERROR_DETAILS"
        );
    }

    return {
        code: details.code.trim(),
        message: details.message.trim()
    };
}

async function transitionClaimedEvent({
    eventId,
    leaseId,
    now,
    status,
    processedAt = null,
    lastError = null
}) {
    validateLeaseInput({ eventId, leaseId, now });

    const update = {
        $set: {
            status,
            processedAt,
            lastError,
            processingLease: null
        }
    };

    const event = await PaystackWebhookEvent.findOneAndUpdate(
        {
            _id: eventId,
            status: "processing",
            "processingLease.leaseId": leaseId,
            "processingLease.expiresAt": {
                $gt: now
            }
        },
        update,
        {
            returnDocument: "after",
            runValidators: true
        }
    );

    if (!event) {
        throw transitionError(
            "Webhook event is no longer owned by this active lease.",
            "PAYSTACK_WEBHOOK_LEASE_LOST"
        );
    }

    return event;
}

export async function completePaystackWebhookEvent({
    eventId,
    leaseId,
    now = new Date()
} = {}) {
    return transitionClaimedEvent({
        eventId,
        leaseId,
        now,
        status: "processed",
        processedAt: new Date(now.getTime()),
        lastError: {
            code: null,
            message: null,
            occurredAt: null
        }
    });
}

export async function failPaystackWebhookEvent({
    eventId,
    leaseId,
    errorDetails,
    now = new Date()
} = {}) {
    const safeError = validateErrorDetails(errorDetails);

    return transitionClaimedEvent({
        eventId,
        leaseId,
        now,
        status: "failed",
        lastError: {
            ...safeError,
            occurredAt: new Date(now.getTime())
        }
    });
}

export async function requirePaystackWebhookReconciliation({
    eventId,
    leaseId,
    errorDetails,
    now = new Date()
} = {}) {
    const safeError = validateErrorDetails(errorDetails);

    return transitionClaimedEvent({
        eventId,
        leaseId,
        now,
        status: "reconciliation_required",
        lastError: {
            ...safeError,
            occurredAt: new Date(now.getTime())
        }
    });
}
