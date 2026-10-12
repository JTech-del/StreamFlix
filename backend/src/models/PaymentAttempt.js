
"use strict";

import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const priceSnapshotSchema = new mongoose.Schema(
    {
        amountMinor: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator(value) {
                    return Number.isSafeInteger(value);
                },
                message: "amountMinor must be a positive safe integer."
            }
        },

        currency: {
            type: String,
            required: true,
            enum: ["NGN"],
            default: "NGN"
        }
    },
    {
        _id: false
    }
);

const purchaseTermsSnapshotSchema = new mongoose.Schema(
    {
        movieId: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    return (
                        value === null ||
                        value === undefined ||
                        (Number.isSafeInteger(value) && value > 0)
                    );
                },
                message: "movieId must be a positive safe integer or null."
            }
        },

        rentalDurationHours: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    return (
                        value === null ||
                        value === undefined ||
                        (Number.isSafeInteger(value) && value > 0)
                    );
                },
                message:
                    "rentalDurationHours must be a positive safe integer or null."
            }
        },

        billingInterval: {
            type: String,
            enum: ["monthly", "annual", null],
            default: null
        }
    },
    {
        _id: false,
        strict: "throw"
    }
);

const paymentAttemptSchema = new mongoose.Schema(
    {
        attemptId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: () => randomUUID(),
            trim: true
        },

        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            minlength: 16,
            maxlength: 200
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: true
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "ProductCatalogue",
            index: true
        },

        purchaseType: {
            type: String,
            required: true,
            enum: ["rental", "subscription"],
            index: true
        },

        priceSnapshot: {
            type: priceSnapshotSchema,
            required: true
        },

        // Snapshot of the purchase terms at attempt creation.
        // Legacy attempts without terms require reconciliation.
        purchaseTermsSnapshot: {
            type: purchaseTermsSnapshotSchema,
            default: null
        },

        provider: {
            type: String,
            required: true,
            enum: ["paystack"],
            default: "paystack"
        },

        providerReference: {
            type: String,
            default: null,
            trim: true,
            maxlength: 200
        },

        // Set only after the provider transaction is verified.
        providerTransactionId: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100,
            match: /^\d+$/
        },

        checkoutUrl: {
            type: String,
            default: null,
            trim: true,
            maxlength: 2048
        },

        status: {
            type: String,
            required: true,
            enum: [
                "created",
                "initialization_pending",
                "pending",
                "verification_pending",
                "succeeded",
                "failed",
                "cancelled",
                "reconciliation_required"
            ],
            default: "created",
            index: true
        },

        correlationId: {
            type: String,
            required: true,
            default: () => randomUUID(),
            index: true,
            trim: true,
            maxlength: 200
        },

        lastError: {
            code: {
                type: String,
                default: null,
                trim: true,
                maxlength: 100
            },

            message: {
                type: String,
                default: null,
                trim: true,
                maxlength: 500
            },

            occurredAt: {
                type: Date,
                default: null
            }
        },

        providerConfirmedAt: {
            type: Date,
            default: null
        },

        finalizedAt: {
            type: Date,
            default: null
        },

        expiresAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true,
        collection: "payment_attempts",
        strict: "throw"
    }
);

paymentAttemptSchema.index({
    userId: 1,
    createdAt: -1
});

paymentAttemptSchema.index({
    status: 1,
    updatedAt: 1
});

// A provider reference belongs to at most one payment attempt.
paymentAttemptSchema.index(
    { providerReference: 1 },
    {
        unique: true,
        partialFilterExpression: {
            providerReference: { $type: "string" }
        }
    }
);

// A verified provider transaction belongs to at most one attempt.
paymentAttemptSchema.index(
    { providerTransactionId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            providerTransactionId: { $type: "string" }
        }
    }
);

const PaymentAttempt =
    mongoose.models.PaymentAttempt ||
    mongoose.model("PaymentAttempt", paymentAttemptSchema);

export default PaymentAttempt;
