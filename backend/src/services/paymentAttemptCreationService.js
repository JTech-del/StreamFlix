"use strict";

import mongoose from "mongoose";
import ProductCatalogue from "../models/ProductCatalogue.js";
import PaymentAttempt from "../models/PaymentAttempt.js";
import e from "express";

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function validateInput({ userId, productId, idempotencyKey }) {
    if (!mongoose.isValidObjectId(userId)) {
        throw makeError(
            "A valid user ID is required.",
            "INVALID_PAYMENT_USER_ID"
        );
    }

    if (!mongoose.isValidObjectId(productId)) {
        throw makeError(
            "A valid product ID is required.",
            "INVALID_PAYMENT_PRODUCT_ID"
        );
    }

    if (
        typeof idempotencyKey !== "string" ||
        idempotencyKey.length < 16 ||
        idempotencyKey.length > 200 ||
        idempotencyKey.trim() !== idempotencyKey
    ) {
        throw makeError(
            "The idempotency key must be 16–200 characters with no surrounding whitespace.",
            "INVALID_PAYMENT_IDEMPOTENCY_KEY"
        );
    }
}

function snapshotPurchaseTerms(product) {
    if (product.productType === "rental") {
        if (
            !Number.isSafeInteger(product.movieId) ||
            product.movieId <= 0 ||
            !Number.isSafeInteger(product.rentalDurationHours) ||
            product.rentalDurationHours <= 0
        ) {
            throw makeError(
                "The rental product has missing or invalid purchase terms.",
                "PAYMENT_PRODUCT_TERMS_INVALID"
            );
        }

        return {
            movieId: product.movieId,
            rentalDurationHours: product.rentalDurationHours,
            billingInterval: null
        };
    }

    if (product.productType === "subscription") {
        if (!["monthly", "annual"].includes(product.billingInterval)) {
            throw makeError(
                "The subscription product has missing or invalid purchase terms.",
                "PAYMENT_PRODUCT_TERMS_INVALID"
            );
        }

        return {
            movieId: null,
            rentalDurationHours: null,
            billingInterval: product.billingInterval
        };
    }

    throw makeError(
        "The product type is not supported for payment.",
        "PAYMENT_PRODUCT_TERMS_INVALID"
    );
}

async function findMatchingExistingAttempt({
    userId,
    productId,
    idempotencyKey
}) {
    const existing = await PaymentAttempt.findOne({ idempotencyKey });

    if (!existing) {
        return null;
    }

    if (String(existing.userId) !== String(userId)) {
        throw makeError(
            "This idempotency key cannot be used for this request.",
            "PAYMENT_IDEMPOTENCY_KEY_CONFLICT"
        );
    }

    if (String(existing.productId) !== String(productId)) {
        throw makeError(
            "This idempotency key has already been used for another product.",
            "PAYMENT_IDEMPOTENCY_KEY_CONFLICT"
        );
    }

    return {
        outcome: "existing_attempt",
        attempt: existing
    };
}

export async function createPaymentAttempt({
    userId,
    productId,
    idempotencyKey
}) {
    validateInput({ userId, productId, idempotencyKey });

    const existing = await findMatchingExistingAttempt({
        userId,
        productId,
        idempotencyKey
    });

    if (existing) {
        return existing;
    }

    const product = await ProductCatalogue.findOne({
        _id: productId,
        status: "active"
    }).lean();

    if (!product) {
        throw makeError(
            "The requested product is unavailable.",
            "PAYMENT_PRODUCT_UNAVAILABLE"
        );
    }

    const purchaseTermsSnapshot = snapshotPurchaseTerms(product);

    const attemptData = {
        userId: new mongoose.Types.ObjectId(String(userId)),
        productId: product._id,
        purchaseType: product.productType,
        priceSnapshot: {
            amountMinor: product.priceMinor,
            currency: product.currency
        },
        purchaseTermsSnapshot,
        idempotencyKey
    };

    try {
        const attempt = await PaymentAttempt.create(attemptData);

        return {
            outcome: "created",
            attempt
        };
    } catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }

        // Another concurrent request may have created this same attempt.
        const concurrentWinner = await findMatchingExistingAttempt({
            userId,
            productId,
            idempotencyKey
        });

        if (concurrentWinner) {
            return concurrentWinner;
        }

        // Do not misclassify an unrelated unique-index collision.
        throw error;
    }
} e