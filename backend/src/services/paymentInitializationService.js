"use strict";

import User from "../models/User.js";
import {
    createPaymentAttempt
} from "./paymentAttemptCreationService.js";
import {
    transitionPaymentAttempt
} from "./paymentAttemptTransitionService.js";
import {
    initializePaystackTransaction
} from "./paystackTransactionService.js";

function makeError(message, code, statusCode = 409) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

export async function initializePaymentForUser({
    userId,
    productId,
    idempotencyKey,
    fetchImpl,
    secretKey
}) {
    const created = await createPaymentAttempt({
        userId,
        productId,
        idempotencyKey
    });

    let attempt = created.attempt;

    // A completed initialization retry returns the same checkout URL.
    if (attempt.status === "pending" && attempt.checkoutUrl) {
        return {
            outcome: "existing_checkout",
            attemptId: attempt.attemptId,
            reference: attempt.providerReference,
            authorizationUrl: attempt.checkoutUrl
        };
    }

    // Never make another provider request for an attempt already in flight
    // or awaiting reconciliation.
    if (attempt.status !== "created") {
        throw makeError(
            "This payment attempt is already being processed or requires reconciliation.",
            "PAYMENT_INITIALIZATION_NOT_RETRYABLE",
            409
        );
    }

    const user = await User.findById(userId).select("email").lean();

    if (!user || typeof user.email !== "string" || !user.email.trim()) {
        throw makeError(
            "The authenticated customer's email could not be retrieved.",
            "PAYMENT_CUSTOMER_EMAIL_UNAVAILABLE",
            422
        );
    }

    // Derive a stable provider reference from the persisted attempt.
    const reference = attempt.providerReference || `SF-${attempt.attemptId}`;

    const claim = await transitionPaymentAttempt({
        attemptId: attempt.attemptId,
        expectedStatus: "created",
        nextStatus: "initialization_pending",
        details: {
            providerReference: reference
        }
    });

    // Only the request that actually wins the atomic transition may call
    // Paystack. "Already in target state" is not permission to call again.
    if (claim.outcome !== "transitioned") {
        if (
            claim.attempt.status === "pending" &&
            claim.attempt.checkoutUrl
        ) {
            return {
                outcome: "existing_checkout",
                attemptId: claim.attempt.attemptId,
                reference: claim.attempt.providerReference,
                authorizationUrl: claim.attempt.checkoutUrl
            };
        }

        throw makeError(
            "Another request claimed this payment attempt. Do not retry provider initialization.",
            "PAYMENT_INITIALIZATION_ALREADY_CLAIMED",
            409
        );
    }

    try {
        const checkout = await initializePaystackTransaction({
            email: user.email,
            amountMinor: attempt.priceSnapshot.amountMinor,
            currency: attempt.priceSnapshot.currency,
            reference,
            ...(fetchImpl ? { fetchImpl } : {}),
            ...(secretKey ? { secretKey } : {})
        });

        const saved = await transitionPaymentAttempt({
            attemptId: attempt.attemptId,
            expectedStatus: "initialization_pending",
            nextStatus: "pending",
            details: {
                providerReference: checkout.reference,
                checkoutUrl: checkout.authorizationUrl
            }
        });

        return {
            outcome: "initialized",
            attemptId: saved.attempt.attemptId,
            reference: saved.attempt.providerReference,
            authorizationUrl: saved.attempt.checkoutUrl
        };
    } catch (cause) {
        // The provider may have received the request even if we did not
        // receive its response. Do not make a blind second initialization.
        try {
            await transitionPaymentAttempt({
                attemptId: attempt.attemptId,
                expectedStatus: "initialization_pending",
                nextStatus: "reconciliation_required",
                details: {
                    lastError: {
                        code: cause.code || "PAYSTACK_INITIALIZATION_UNCERTAIN",
                        message: "Provider initialization outcome requires reconciliation.",
                        occurredAt: new Date()
                    }
                }
            });
        } catch {
            // Preserve the original error. The persisted state must be
            // inspected if the database transition itself could not finish.
        }

        throw makeError(
            "Payment initialization could not be safely confirmed. Do not create a new attempt; reconciliation is required.",
            "PAYMENT_INITIALIZATION_RECONCILIATION_REQUIRED",
            503
        );
    }
}
