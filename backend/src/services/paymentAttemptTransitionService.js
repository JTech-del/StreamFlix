"use strict";

import PaymentAttempt from "../models/PaymentAttempt.js";
import {
    assertPaymentAttemptTransition
} from "./paymentAttemptStateMachine.js";

export async function transitionPaymentAttempt({
    attemptId,
    expectedStatus,
    nextStatus,
    details = {}
}) {
    if (!attemptId) {
        throw new Error("Payment attempt ID is required.");
    }

    assertPaymentAttemptTransition(expectedStatus, nextStatus);

    if (nextStatus === "succeeded") {
        const error = new Error(
            "Successful payments must use the verified payment finalization path."
        );

        error.code = "PAYMENT_FINALIZATION_REQUIRED";

        throw error;
    }

    const allowedDetailKeys = new Set([
        "providerReference",
        "checkoutUrl",
        "lastError",
        "expiresAt"
    ]);

    for (const key of Object.keys(details)) {
        if (!allowedDetailKeys.has(key)) {
            throw new Error(`Unsupported payment transition detail: ${key}`);
        }
    }

    const update = {
        $set: {
            status: nextStatus
        }
    };

    if (Object.hasOwn(details, "providerReference")) {
        update.$set.providerReference = details.providerReference;
    }

    if (Object.hasOwn(details, "checkoutUrl")) {
        update.$set.checkoutUrl = details.checkoutUrl;
    }

    if (Object.hasOwn(details, "lastError")) {
        update.$set.lastError = details.lastError;
    }

    if (Object.hasOwn(details, "expiresAt")) {
        update.$set.expiresAt = details.expiresAt;
    }

    const updated = await PaymentAttempt.findOneAndUpdate(
        {
            attemptId,
            status: expectedStatus
        },
        update,
        {
            returnDocument: "after",
            runValidators: true
        }
    );

    if (updated) {
        return {
            outcome: "transitioned",
            attempt: updated
        };
    }

    const current = await PaymentAttempt.findOne({
        attemptId
    });

    if (!current) {
        const error = new Error("Payment attempt was not found.");
        error.code = "PAYMENT_ATTEMPT_NOT_FOUND";
        throw error;
    }

    if (current.status === nextStatus) {
        return {
            outcome: "already_in_target_state",
            attempt: current
        };
    }

    const error = new Error(
        `Payment attempt status conflict: expected ${expectedStatus}, found ${current.status}.`
    );

    error.code = "PAYMENT_ATTEMPT_STATUS_CONFLICT";

    throw error;
}
