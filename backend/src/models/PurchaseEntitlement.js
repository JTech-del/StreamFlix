
"use strict";

import mongoose from "mongoose";

const purchaseEntitlementSchema = new mongoose.Schema(
    {
        paymentAttemptRef: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PaymentAttempt",
            unique: true
        },

        attemptId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            unique: true
        },

        provider: {
            type: String,
            required: true,
            enum: ["paystack"],
            default: "paystack"
        },

        providerTransactionId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            match: /^\d+$/,
            unique: true
        },

        providerReference: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
            unique: true
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

        movieId: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    if (this.purchaseType === "rental") {
                        return Number.isSafeInteger(value) && value > 0;
                    }

                    return value === null || value === undefined;
                },
                message:
                    "Rental entitlements require a valid movie ID; subscriptions must not have one."
            }
        },

        rentalDurationHours: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    if (this.purchaseType === "rental") {
                        return Number.isSafeInteger(value) && value > 0;
                    }

                    return value === null || value === undefined;
                },
                message:
                    "Rental entitlements require a positive integer duration; subscriptions must not have one."
            }
        },

        billingInterval: {
            type: String,
            enum: ["monthly", "annual", null],
            default: null,
            validate: {
                validator(value) {
                    if (this.purchaseType === "subscription") {
                        return value === "monthly" || value === "annual";
                    }

                    return value === null || value === undefined;
                },
                message:
                    "Subscription entitlements require a billing interval; rentals must not have one."
            }
        },

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
        },

        status: {
            type: String,
            required: true,
            enum: ["active", "revoked"],
            default: "active",
            index: true
        },

        grantedAt: {
            type: Date,
            required: true
        },

        startsAt: {
            type: Date,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true,
            validate: {
                validator(value) {
                    return (
                        this.startsAt instanceof Date &&
                        Number.isFinite(this.startsAt.getTime()) &&
                        value instanceof Date &&
                        Number.isFinite(value.getTime()) &&
                        value.getTime() > this.startsAt.getTime()
                    );
                },
                message: "expiresAt must be later than startsAt."
            },
            index: true
        },

        revokedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        collection: "purchase_entitlements",
        strict: "throw"
    }
);

purchaseEntitlementSchema.index({
    userId: 1,
    status: 1,
    expiresAt: 1
});

purchaseEntitlementSchema.index({
    userId: 1,
    purchaseType: 1,
    startsAt: 1,
    expiresAt: 1
});

const PurchaseEntitlement =
    mongoose.models.PurchaseEntitlement ||
    mongoose.model("PurchaseEntitlement", purchaseEntitlementSchema);

export default PurchaseEntitlement;
