"use strict";

import express from "express";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

import {
    initializePaymentForUser
} from "../services/paymentInitializationService.js";

const router = express.Router();

function getSafeErrorResponse(error) {
    const statusByCode = {
        INVALID_PAYMENT_USER_ID: 400,
        INVALID_PAYMENT_PRODUCT_ID: 400,
        INVALID_PAYMENT_IDEMPOTENCY_KEY: 400,
        PAYMENT_IDEMPOTENCY_KEY_CONFLICT: 409,
        PAYMENT_PRODUCT_UNAVAILABLE: 404,
        PAYMENT_CUSTOMER_EMAIL_UNAVAILABLE: 422,
        PAYMENT_INITIALIZATION_NOT_RETRYABLE: 409,
        PAYMENT_INITIALIZATION_ALREADY_CLAIMED: 409,
        PAYMENT_INITIALIZATION_RECONCILIATION_REQUIRED: 503
    };

    const statusCode = Number.isInteger(error?.statusCode)
        ? error.statusCode
        : (statusByCode[error?.code] || 500);

    const safeMessages = {
        INVALID_PAYMENT_USER_ID: "The authenticated customer could not be validated.",
        INVALID_PAYMENT_PRODUCT_ID: "A valid product ID is required.",
        INVALID_PAYMENT_IDEMPOTENCY_KEY: "Provide a valid Idempotency-Key header containing 16–200 characters.",
        PAYMENT_IDEMPOTENCY_KEY_CONFLICT: "This idempotency key has already been used for a different payment request.",
        PAYMENT_PRODUCT_UNAVAILABLE: "The requested product is unavailable.",
        PAYMENT_CUSTOMER_EMAIL_UNAVAILABLE: "The customer's email is unavailable for checkout.",
        PAYMENT_INITIALIZATION_NOT_RETRYABLE: "This payment attempt cannot be initialized again. Reconciliation may be required.",
        PAYMENT_INITIALIZATION_ALREADY_CLAIMED: "This payment attempt is already being initialized. Do not start another attempt.",
        PAYMENT_INITIALIZATION_RECONCILIATION_REQUIRED: "Checkout initialization could not be safely confirmed. Reconciliation is required."
    };

    return {
        statusCode,
        message: statusCode >= 500 && !safeMessages[error?.code]
            ? "Payment initialization failed."
            : (safeMessages[error?.code] || "The payment request could not be completed.")
    };
}

router.post(
    "/initialize",
    requireAuthentication,
    async (req, res) => {
        const idempotencyKey = req.get("Idempotency-Key");
        const productId = req.body?.productId;

        if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
            return res.status(400).json({
                success: false,
                message: "The Idempotency-Key header is required."
            });
        }

        if (typeof productId !== "string" || !productId.trim()) {
            return res.status(400).json({
                success: false,
                message: "A productId is required."
            });
        }

        try {
            const result = await initializePaymentForUser({
                userId: req.user.id,
                productId,
                idempotencyKey
            });

            return res.status(
                result.outcome === "initialized" ? 201 : 200
            ).json({
                success: true,
                outcome: result.outcome,
                attemptId: result.attemptId,
                reference: result.reference,
                authorizationUrl: result.authorizationUrl
            });
        } catch (error) {
            const safeResponse = getSafeErrorResponse(error);

            if (safeResponse.statusCode >= 500) {
                console.error(
                    "Payment initialization route failed:",
                    error?.code || "UNEXPECTED_PAYMENT_ERROR"
                );
            }

            return res.status(safeResponse.statusCode).json({
                success: false,
                message: safeResponse.message,
                ...(error?.code ? { code: error.code } : {})
            });
        }
    }
);

export default router;
