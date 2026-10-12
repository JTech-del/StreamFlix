"use strict";

import mongoose from "mongoose";

const paystackWebhookEventSchema = new mongoose.Schema(
    {
        eventKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            minlength: 1,
            maxlength: 300
        },

        eventType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            index: true
        },

        providerReference: {
            type: String,
            default: null,
            trim: true,
            maxlength: 200,
            index: true
        },

        providerTransactionId: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100
        },

        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        status: {
            type: String,
            required: true,
            enum: [
                "received",
                "processing",
                "processed",
                "failed",
                "reconciliation_required"
            ],
            default: "received",
            index: true
        },

        processingLease: {
            type: new mongoose.Schema(
                {
                    leaseId: {
                        type: String,
                        default: null,
                        trim: true,
                        maxlength: 100
                    },

                    owner: {
                        name: {
                            type: String,
                            default: null,
                            trim: true,
                            maxlength: 100
                        },

                        instanceId: {
                            type: String,
                            default: null,
                            trim: true,
                            maxlength: 200
                        }
                    },

                    acquiredAt: {
                        type: Date,
                        default: null
                    },

                    expiresAt: {
                        type: Date,
                        default: null
                    }
                },
                {
                    _id: false
                }
            ),
            default: null
        },

        attempts: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            validate: {
                validator(value) {
                    return Number.isSafeInteger(value);
                },
                message: "attempts must be a non-negative safe integer."
            }
        },

        receivedAt: {
            type: Date,
            required: true,
            default: Date.now
        },

        processedAt: {
            type: Date,
            default: null
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
        }
    },
    {
        timestamps: true,
        collection: "paystack_webhook_events",
        strict: "throw"
    }
);

paystackWebhookEventSchema.index({
    status: 1,
    receivedAt: 1
});

paystackWebhookEventSchema.index({
    status: 1,
    "processingLease.expiresAt": 1
});

const PaystackWebhookEvent =
    mongoose.models.PaystackWebhookEvent ||
    mongoose.model("PaystackWebhookEvent", paystackWebhookEventSchema);

export default PaystackWebhookEvent;
