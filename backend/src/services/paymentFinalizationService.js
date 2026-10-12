"use strict";

import mongoose from "mongoose";

import PaymentAttempt from "../models/PaymentAttempt.js";
import PurchaseEntitlement from "../models/PurchaseEntitlement.js";

import {
    assertPaymentAttemptTransition
} from "./paymentAttemptStateMachine.js";

import {
    verifyPaystackTransaction
} from "./paystackTransactionVerificationService.js";

function makeError(message, code, statusCode = 409) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function validateNow(now) {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
        throw makeError(
            "A valid finalization timestamp is required.",
            "PAYMENT_FINALIZATION_INVALID_TIMESTAMP",
            400
        );
    }
}

function getPurchaseTerms(attempt) {
    const terms = attempt.purchaseTermsSnapshot;

    if (!terms) {
        throw makeError(
            "Purchase terms are missing. The payment requires reconciliation.",
            "PAYMENT_PURCHASE_TERMS_MISSING"
        );
    }

    if (attempt.purchaseType === "rental") {
        if (
            !Number.isSafeInteger(terms.movieId) ||
            terms.movieId <= 0 ||
            !Number.isSafeInteger(terms.rentalDurationHours) ||
            terms.rentalDurationHours <= 0 ||
            (terms.billingInterval != null)
        ) {
            throw makeError(
                "Rental purchase terms are invalid.",
                "PAYMENT_PURCHASE_TERMS_INVALID"
            );
        }

        return {
            movieId: terms.movieId,
            rentalDurationHours: terms.rentalDurationHours,
            billingInterval: null
        };
    }

    if (attempt.purchaseType === "subscription") {
        if (
            terms.movieId != null ||
            terms.rentalDurationHours != null ||
            !["monthly", "annual"].includes(terms.billingInterval)
        ) {
            throw makeError(
                "Subscription purchase terms are invalid.",
                "PAYMENT_PURCHASE_TERMS_INVALID"
            );
        }

        return {
            movieId: null,
            rentalDurationHours: null,
            billingInterval: terms.billingInterval
        };
    }

    throw makeError(
        "The payment purchase type is not supported.",
        "PAYMENT_PURCHASE_TYPE_INVALID"
    );
}

function calculateExpiry(startsAt, purchaseType, terms) {
    let expiresAt;

    if (purchaseType === "rental") {
        expiresAt = new Date(
            startsAt.getTime() +
            terms.rentalDurationHours * 60 * 60 * 1000
        );
    } else {
        // Add a calendar month or year and clamp at month end.
        // For example, January 31 + one month becomes February 28
        // in a non-leap year rather than overflowing into March.
        expiresAt = new Date(startsAt.getTime());

        const originalDay = expiresAt.getUTCDate();

        expiresAt.setUTCDate(1);

        if (terms.billingInterval === "monthly") {
            expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
        } else {
            expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
        }

        const nextMonthStart = new Date(
            Date.UTC(
                expiresAt.getUTCFullYear(),
                expiresAt.getUTCMonth() + 1,
                1
            )
        );

        const lastDayOfTargetMonth = new Date(
            nextMonthStart.getTime() - 24 * 60 * 60 * 1000
        ).getUTCDate();

        expiresAt.setUTCDate(
            Math.min(originalDay, lastDayOfTargetMonth)
        );
    }

    if (
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt.getTime() <= startsAt.getTime()
    ) {
        throw makeError(
            "The entitlement expiry could not be calculated safely.",
            "PAYMENT_ENTITLEMENT_EXPIRY_INVALID"
        );
    }

    return expiresAt;
}

async function transitionInTransaction({
    attemptId,
    fromStatus,
    toStatus,
    session
}) {
    assertPaymentAttemptTransition(fromStatus, toStatus);

    const updated = await PaymentAttempt.findOneAndUpdate(
        {
            attemptId,
            status: fromStatus
        },
        {
            $set: {
                status: toStatus
            }
        },
        {
            session,
            returnDocument: "after",
            runValidators: true
        }
    );

    if (!updated) {
        throw makeError(
            "The payment attempt changed during finalization.",
            "PAYMENT_ATTEMPT_STATUS_CONFLICT"
        );
    }

    return updated;
}

function sameEntitlementIdentity(attempt, entitlement) {
    return Boolean(
        entitlement &&
        entitlement.attemptId === attempt.attemptId &&
        entitlement.paymentAttemptRef.toString() ===
            attempt._id.toString() &&
        entitlement.providerReference === attempt.providerReference &&
        entitlement.providerTransactionId ===
            attempt.providerTransactionId &&
        entitlement.userId.toString() === attempt.userId.toString() &&
        entitlement.productId.toString() === attempt.productId.toString()
    );
}

async function alreadyFinalized(attempt, session) {
    const query = PurchaseEntitlement.findOne({
        paymentAttemptRef: attempt._id
    });

    if (session) {
        query.session(session);
    }

    const entitlement = await query;

    if (
        attempt.status !== "succeeded" ||
        !attempt.providerTransactionId ||
        !sameEntitlementIdentity(attempt, entitlement)
    ) {
        throw makeError(
            "Payment and entitlement records are inconsistent. Reconciliation is required.",
            "PAYMENT_FINALIZATION_INCONSISTENT"
        );
    }

    return {
        outcome: "already_finalized",
        attempt,
        entitlement
    };
}

async function verifyTransaction(attempt, options) {
    if (
        typeof attempt.providerReference !== "string" ||
        !attempt.providerReference ||
        !attempt.priceSnapshot ||
        !Number.isSafeInteger(attempt.priceSnapshot.amountMinor) ||
        attempt.priceSnapshot.amountMinor <= 0 ||
        attempt.priceSnapshot.currency !== "NGN"
    ) {
        throw makeError(
            "The payment attempt lacks valid provider verification details.",
            "PAYMENT_VERIFICATION_DETAILS_INVALID"
        );
    }

    const verified = await verifyPaystackTransaction({
        reference: attempt.providerReference,
        amountMinor: attempt.priceSnapshot.amountMinor,
        currency: attempt.priceSnapshot.currency,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        ...(options.secretKey ? { secretKey: options.secretKey } : {})
    });

    if (
        verified.verified !== true ||
        verified.status !== "success" ||
        verified.reference !== attempt.providerReference ||
        verified.amountMinor !== attempt.priceSnapshot.amountMinor ||
        verified.currency !== attempt.priceSnapshot.currency ||
        !Number.isSafeInteger(verified.transactionId) ||
        verified.transactionId <= 0
    ) {
        throw makeError(
            "The provider verification result does not match the payment attempt.",
            "PAYMENT_VERIFICATION_MISMATCH"
        );
    }

    return verified;
}

export async function finalizePaymentAttempt({
    attemptId,
    fetchImpl,
    secretKey,
    now = new Date()
} = {}) {
    validateNow(now);

    if (
        typeof attemptId !== "string" ||
        attemptId.trim() === "" ||
        attemptId.trim() !== attemptId ||
        attemptId.length > 100
    ) {
        throw makeError(
            "A valid payment attempt ID is required.",
            "PAYMENT_ATTEMPT_ID_INVALID",
            400
        );
    }

    const initialAttempt = await PaymentAttempt.findOne({ attemptId });

    if (!initialAttempt) {
        throw makeError(
            "Payment attempt was not found.",
            "PAYMENT_ATTEMPT_NOT_FOUND",
            404
        );
    }

    // A previously completed attempt must already have a matching grant.
    // Never silently create a missing entitlement for a legacy success.
    if (initialAttempt.status === "succeeded") {
        return alreadyFinalized(initialAttempt);
    }

    const allowedStatuses = [
        "initialization_pending",
        "pending",
        "verification_pending",
        "reconciliation_required"
    ];

    if (!allowedStatuses.includes(initialAttempt.status)) {
        throw makeError(
            "The payment attempt is not eligible for finalization.",
            "PAYMENT_ATTEMPT_NOT_FINALIZABLE"
        );
    }

    // Validate the snapshot before making a provider verification request.
    getPurchaseTerms(initialAttempt);

    const verified = await verifyTransaction(initialAttempt, {
        fetchImpl,
        secretKey
    });

    const providerTransactionId = String(verified.transactionId);
    const finalizedAt = new Date(now.getTime());

    const session = await mongoose.startSession();
    let result;

    try {
        await session.withTransaction(async () => {
            const current = await PaymentAttempt.findOne({
                attemptId
            }).session(session);

            if (!current) {
                throw makeError(
                    "Payment attempt was not found.",
                    "PAYMENT_ATTEMPT_NOT_FOUND",
                    404
                );
            }

            // Another worker may have committed while Paystack was queried.
            if (current.status === "succeeded") {
                const previous = await alreadyFinalized(
                    current,
                    session
                );

                if (
                    current.providerTransactionId !==
                    providerTransactionId
                ) {
                    throw makeError(
                        "The provider transaction differs from the finalized payment.",
                        "PAYMENT_FINALIZATION_CONFLICT"
                    );
                }

                result = previous;
                return;
            }

            if (!allowedStatuses.includes(current.status)) {
                throw makeError(
                    "The payment attempt is not eligible for finalization.",
                    "PAYMENT_ATTEMPT_NOT_FINALIZABLE"
                );
            }

            // Recheck persisted values within the transaction.
            if (
                current.providerReference !== verified.reference ||
                current.priceSnapshot.amountMinor !== verified.amountMinor ||
                current.priceSnapshot.currency !== verified.currency
            ) {
                throw makeError(
                    "The current payment attempt no longer matches the verified transaction.",
                    "PAYMENT_VERIFICATION_MISMATCH"
                );
            }

            const terms = getPurchaseTerms(current);

            let status = current.status;

            // Follow the existing state machine, keeping every change
            // inside the transaction so observers see only the final commit.
            if (status === "initialization_pending") {
                await transitionInTransaction({
                    attemptId,
                    fromStatus: status,
                    toStatus: "pending",
                    session
                });

                status = "pending";
            }

            if (
                status === "pending" ||
                status === "reconciliation_required"
            ) {
                await transitionInTransaction({
                    attemptId,
                    fromStatus: status,
                    toStatus: "verification_pending",
                    session
                });

                status = "verification_pending";
            }

            if (status !== "verification_pending") {
                throw makeError(
                    "The payment attempt could not enter verification finalization.",
                    "PAYMENT_ATTEMPT_STATUS_CONFLICT"
                );
            }

            const expiresAt = calculateExpiry(
                finalizedAt,
                current.purchaseType,
                terms
            );

            // Unique indexes on the entitlement model prevent duplicate grants.
            const [entitlement] = await PurchaseEntitlement.create(
                [
                    {
                        paymentAttemptRef: current._id,
                        attemptId: current.attemptId,
                        provider: current.provider,
                        providerTransactionId,
                        providerReference: current.providerReference,
                        userId: current.userId,
                        productId: current.productId,
                        purchaseType: current.purchaseType,
                        movieId: terms.movieId,
                        rentalDurationHours: terms.rentalDurationHours,
                        billingInterval: terms.billingInterval,
                        amountMinor: current.priceSnapshot.amountMinor,
                        currency: current.priceSnapshot.currency,
                        status: "active",
                        grantedAt: finalizedAt,
                        startsAt: finalizedAt,
                        expiresAt
                    }
                ],
                {
                    session
                }
            );

            assertPaymentAttemptTransition(
                "verification_pending",
                "succeeded"
            );

            const finalizedAttempt =
                await PaymentAttempt.findOneAndUpdate(
                    {
                        attemptId,
                        status: "verification_pending"
                    },
                    {
                        $set: {
                            status: "succeeded",
                            providerTransactionId,
                            providerConfirmedAt: finalizedAt,
                            finalizedAt,
                            "lastError.code": null,
                            "lastError.message": null,
                            "lastError.occurredAt": null
                        }
                    },
                    {
                        session,
                        returnDocument: "after",
                        runValidators: true
                    }
                );

            if (!finalizedAttempt) {
                throw makeError(
                    "Payment status could not be finalized.",
                    "PAYMENT_FINALIZATION_STATUS_UPDATE_FAILED"
                );
            }

            result = {
                outcome: "finalized",
                attempt: finalizedAttempt,
                entitlement
            };
        });

        return result;
    } catch (error) {
        if (error?.code === 11000) {
            // The transaction may have lost a race against another worker.
            // Return success only if that worker committed the same payment
            // attempt and the same provider transaction.
            const [latestAttempt, byAttempt, byTransaction, attemptByTransaction] =
                await Promise.all([
                    PaymentAttempt.findOne({ attemptId }),
                    PurchaseEntitlement.findOne({
                        attemptId
                    }),
                    PurchaseEntitlement.findOne({
                        providerTransactionId
                    }),
                    PaymentAttempt.findOne({
                        providerTransactionId
                    })
                ]);

            if (
                latestAttempt?.status === "succeeded" &&
                latestAttempt.providerTransactionId === providerTransactionId &&
                sameEntitlementIdentity(latestAttempt, byAttempt)
            ) {
                return {
                    outcome: "already_finalized",
                    attempt: latestAttempt,
                    entitlement: byAttempt
                };
            }

            if (
                (byTransaction && byTransaction.attemptId !== attemptId) ||
                (attemptByTransaction &&
                    attemptByTransaction.attemptId !== attemptId)
            ) {
                throw makeError(
                    "This Paystack transaction has already been applied to another payment attempt.",
                    "PAYMENT_TRANSACTION_ALREADY_APPLIED"
                );
            }

            throw makeError(
                "A uniqueness conflict interrupted payment finalization. Reconciliation is required.",
                "PAYMENT_FINALIZATION_UNIQUENESS_CONFLICT"
            );
        }

        throw error;
    } finally {
        await session.endSession();
    }
}