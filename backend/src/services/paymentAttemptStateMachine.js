"use strict";

export const PAYMENT_ATTEMPT_STATUSES = Object.freeze([
    "created",
    "initialization_pending",
    "pending",
    "verification_pending",
    "succeeded",
    "failed",
    "cancelled",
    "reconciliation_required"
]);

const allowedTransitions = Object.freeze({
    created: Object.freeze([
        "initialization_pending",
        "cancelled"
    ]),

    initialization_pending: Object.freeze([
        "pending",
        "failed",
        "reconciliation_required"
    ]),

    pending: Object.freeze([
        "verification_pending",
        "failed",
        "cancelled",
        "reconciliation_required"
    ]),

    verification_pending: Object.freeze([
        "succeeded",
        "failed",
        "reconciliation_required"
    ]),

    succeeded: Object.freeze([]),
    failed: Object.freeze([]),
    cancelled: Object.freeze([]),

    reconciliation_required: Object.freeze([
        "verification_pending"
    ])
});

export function canTransitionPaymentAttempt(currentStatus, nextStatus) {
    if (
        !PAYMENT_ATTEMPT_STATUSES.includes(currentStatus) ||
        !PAYMENT_ATTEMPT_STATUSES.includes(nextStatus)
    ) {
        return false;
    }

    if (currentStatus === nextStatus) {
        return true;
    }

    return allowedTransitions[currentStatus].includes(nextStatus);
}

export function assertPaymentAttemptTransition(currentStatus, nextStatus) {
    if (canTransitionPaymentAttempt(currentStatus, nextStatus)) {
        return;
    }

    const error = new Error(
        `Invalid payment attempt transition: ${currentStatus} -> ${nextStatus}`
    );

    error.code = "INVALID_PAYMENT_ATTEMPT_TRANSITION";

    throw error;
}
