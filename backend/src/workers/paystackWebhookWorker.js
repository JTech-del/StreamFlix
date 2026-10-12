
"use strict";

import PaymentAttempt from "../models/PaymentAttempt.js";

import {
    claimNextPaystackWebhookEvent
} from "../services/paystackWebhookClaimService.js";

import {
    completePaystackWebhookEvent,
    requirePaystackWebhookReconciliation
} from "../services/paystackWebhookTransitionService.js";

import {
    verifyPaystackTransaction
} from "../services/paystackTransactionVerificationService.js";

import {
    finalizePaymentAttempt
} from "../services/paymentFinalizationService.js";

const WORKER_NAME = "paystack-webhook-worker";
const LEASE_DURATION_MS = 120_000;
const MAX_ATTEMPTS = 10;

const RECONCILIATION_CODES = new Set([
    "PAYSTACK_VERIFICATION_MISMATCH",
    "PAYSTACK_TRANSACTION_ALREADY_APPLIED",
    "PAYMENT_ATTEMPT_NOT_FOUND",
    "PAYMENT_ATTEMPT_NOT_FINALIZABLE",
    "PAYMENT_ATTEMPT_STATUS_CONFLICT",
    "PAYMENT_FINALIZATION_INCONSISTENT",
    "PAYMENT_FINALIZATION_CONFLICT",
    "PAYMENT_FINALIZATION_UNIQUENESS_CONFLICT",
    "PAYMENT_VERIFICATION_DETAILS_INVALID",
    "PAYMENT_VERIFICATION_MISMATCH",
    "PAYMENT_PURCHASE_TERMS_MISSING",
    "PAYMENT_PURCHASE_TERMS_INVALID",
    "PAYMENT_PURCHASE_TYPE_INVALID",
    "PAYMENT_ENTITLEMENT_EXPIRY_INVALID"
]);

function workerError(message, code, requiresReconciliation = false) {
    const error = new Error(message);
    error.code = code;
    error.requiresReconciliation = requiresReconciliation;
    return error;
}

function safeErrorCode(error) {
    if (
        typeof error?.code === "string" &&
        /^[A-Z0-9_-]{1,100}$/.test(error.code)
    ) {
        return error.code;
    }

    return "PAYSTACK_WEBHOOK_PROCESSING_FAILED";
}

function reconciliationMessage(code) {
    switch (code) {
        case "PAYMENT_ATTEMPT_NOT_FOUND":
            return "No matching payment attempt was found. Manual reconciliation is required.";

        case "PAYMENT_PURCHASE_TERMS_MISSING":
        case "PAYMENT_PURCHASE_TERMS_INVALID":
        case "PAYMENT_PURCHASE_TYPE_INVALID":
            return "The payment purchase terms are missing or invalid.";

        case "PAYSTACK_VERIFICATION_MISMATCH":
        case "PAYMENT_VERIFICATION_MISMATCH":
            return "The webhook and verified payment details do not match.";

        case "PAYMENT_TRANSACTION_ALREADY_APPLIED":
        case "PAYMENT_FINALIZATION_UNIQUENESS_CONFLICT":
            return "The provider transaction conflicts with an existing payment record.";

        default:
            return "Payment processing requires manual reconciliation.";
    }
}

async function reconcileClaimedEvent({
    eventId,
    leaseId,
    code,
    now = new Date(),
    reconciliationOperation = requirePaystackWebhookReconciliation
}) {
    await reconciliationOperation({
        eventId,
        leaseId,
        now,
        errorDetails: {
            code,
            message: reconciliationMessage(code)
        }
    });

    return {
        outcome: "reconciliation_required",
        eventId,
        code
    };
}

export async function processNextPaystackWebhookEvent({
    workerName = WORKER_NAME,
    instanceId = process.pid.toString(),
    claimOperation = claimNextPaystackWebhookEvent,
    completeOperation = completePaystackWebhookEvent,
    reconciliationOperation = requirePaystackWebhookReconciliation,
    verifyOperation = verifyPaystackTransaction,
    finalizeOperation = finalizePaymentAttempt,
    fetchImpl,
    secretKey
} = {}) {
    const claimed = await claimOperation({
        worker: {
            name: workerName,
            instanceId
        },
        leaseDurationMs: LEASE_DURATION_MS,
        now: new Date()
    });

    if (!claimed) {
        return {
            outcome: "idle"
        };
    }

    const eventId = claimed._id.toString();
    const leaseId = claimed.processingLease?.leaseId;

    if (!leaseId) {
        throw workerError(
            "Claimed webhook event has no processing lease.",
            "PAYSTACK_WEBHOOK_LEASE_MISSING"
        );
    }

    try {
        const payload = claimed.payload;
        const data = payload?.data;

        if (
            !payload ||
            payload.event !== claimed.eventType ||
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            throw workerError(
                "Webhook payload does not match its persisted event identity.",
                "PAYSTACK_WEBHOOK_DATA_INVALID",
                true
            );
        }

        // Only charge.success is allowed to finalize a purchase.
        // Other valid Paystack events are acknowledged without granting access.
        if (claimed.eventType !== "charge.success") {
            await completeOperation({
                eventId,
                leaseId,
                now: new Date()
            });

            return {
                outcome: "processed",
                action: "ignored_non_success_event",
                eventId,
                eventType: claimed.eventType
            };
        }

        const reference = claimed.providerReference;

        if (
            typeof reference !== "string" ||
            reference.trim() === "" ||
            data.reference !== reference
        ) {
            throw workerError(
                "The success webhook has a missing or inconsistent payment reference.",
                "PAYSTACK_WEBHOOK_DATA_INVALID",
                true
            );
        }

        const webhookTransactionId =
            claimed.providerTransactionId == null
                ? null
                : String(claimed.providerTransactionId);

        if (
            webhookTransactionId !== null &&
            !/^\d+$/.test(webhookTransactionId)
        ) {
            throw workerError(
                "The webhook transaction ID is invalid.",
                "PAYSTACK_WEBHOOK_DATA_INVALID",
                true
            );
        }

        const attempt = await PaymentAttempt.findOne({
            providerReference: reference
        });

        if (!attempt) {
            throw workerError(
                "No payment attempt matches the webhook reference.",
                "PAYMENT_ATTEMPT_NOT_FOUND",
                true
            );
        }

        if (attempt.provider !== "paystack") {
            throw workerError(
                "The payment attempt uses an unexpected provider.",
                "PAYMENT_VERIFICATION_DETAILS_INVALID",
                true
            );
        }

        // If already finalized, require the webhook's transaction ID to
        // agree with the durable payment record before acknowledging it.
        if (attempt.status === "succeeded") {
            if (
                webhookTransactionId !== null &&
                attempt.providerTransactionId !== webhookTransactionId
            ) {
                throw workerError(
                    "The webhook transaction ID conflicts with the finalized payment.",
                    "PAYMENT_FINALIZATION_CONFLICT",
                    true
                );
            }
        } else {
            const eligibleStatuses = [
                "initialization_pending",
                "pending",
                "verification_pending",
                "reconciliation_required"
            ];

            if (!eligibleStatuses.includes(attempt.status)) {
                throw workerError(
                    "The payment attempt is not eligible for finalization.",
                    "PAYMENT_ATTEMPT_NOT_FINALIZABLE",
                    true
                );
            }

            // Verify the webhook's transaction identity before attempting
            // finalization. The finalization service verifies independently
            // as well, so it never relies solely on the webhook payload.
            const verified = await verifyOperation({
                reference,
                amountMinor: attempt.priceSnapshot.amountMinor,
                currency: attempt.priceSnapshot.currency,
                ...(fetchImpl ? { fetchImpl } : {}),
                ...(secretKey ? { secretKey } : {})
            });

            if (
                verified.verified !== true ||
                verified.status !== "success"
            ) {
                throw workerError(
                    "Paystack has not confirmed the transaction as successful.",
                    "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL"
                );
            }

            if (
                webhookTransactionId !== null &&
                String(verified.transactionId) !== webhookTransactionId
            ) {
                throw workerError(
                    "The webhook transaction ID does not match Paystack verification.",
                    "PAYSTACK_VERIFICATION_MISMATCH",
                    true
                );
            }
        }

        const finalized = await finalizeOperation({
            attemptId: attempt.attemptId,
            ...(fetchImpl ? { fetchImpl } : {}),
            ...(secretKey ? { secretKey } : {}),
            now: new Date()
        });

        const finalAttempt = finalized.attempt;
        const finalTransactionId = finalAttempt?.providerTransactionId;

        if (
            !finalTransactionId ||
            (
                webhookTransactionId !== null &&
                finalTransactionId !== webhookTransactionId
            )
        ) {
            throw workerError(
                "Finalized payment and webhook transaction identities are inconsistent.",
                "PAYMENT_FINALIZATION_INCONSISTENT",
                true
            );
        }

        await completeOperation({
            eventId,
            leaseId,
            now: new Date()
        });

        return {
            outcome: "processed",
            action: "payment_finalized",
            eventId,
            attemptId: attempt.attemptId,
            finalizationOutcome: finalized.outcome
        };
    } catch (error) {
        // Once ownership has been lost, this worker must not attempt
        // another transition with a stale lease.
        if (error?.code === "PAYSTACK_WEBHOOK_LEASE_LOST") {
            throw error;
        }

        const code = safeErrorCode(error);

        if (
            error?.requiresReconciliation ||
            RECONCILIATION_CODES.has(code)
        ) {
            return reconcileClaimedEvent({
                eventId,
                leaseId,
                code,
                reconciliationOperation
            });
        }

        // A timeout or uncertain provider response is not a confirmed
        // failure. Keep the processing lease; the event can be reclaimed
        // after its expiry. Avoid blind new checkout initialization.
        if (claimed.attempts >= MAX_ATTEMPTS) {
            return reconcileClaimedEvent({
                eventId,
                leaseId,
                code: "PAYSTACK_WEBHOOK_MAX_ATTEMPTS",
                reconciliationOperation
            });
        }

        return {
            outcome: "retry_waiting_for_lease_expiry",
            eventId,
            attempts: claimed.attempts,
            errorCode: code
        };
    }
}
