"use strict";

import mongoose from "mongoose";

const outboxSchema = new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },

        eventType: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        aggregateType: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        aggregateId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        status: {
            type: String,
            required: true,
            enum: [
                "pending",
                "published",
                "failed"
            ],
            default: "pending",
            index: true
        },

        attempts: {
            type: Number,
            default: 0,
            min: 0
        },

        maxAttempts: {
            type: Number,
            default: 3,
            min: 1
        },

        publishedAt: {
            type: Date,
            default: null
        },

        lastAttemptAt: {
            type: Date,
            default: null
        },

        nextAttemptAt: {
            type: Date,
            default: null,
            index: true
        },

        lastError: {
            code: {
                type: String,
                default: null,
                trim: true
            },

            message: {
                type: String,
                default: null,
                trim: true
            },

            occurredAt: {
                type: Date,
                default: null
            }
        },

        dispatchLease: {
            type: new mongoose.Schema(
                {
                    leaseId: {
                        type: String,
                        default: null,
                        trim: true
                    },

                    owner: {
                        name: {
                            type: String,
                            default: null,
                            trim: true
                        },

                        instanceId: {
                            type: String,
                            default: null,
                            trim: true
                        }
                    },

                    acquiredAt: {
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
                    _id: false
                }
            ),

            default: null
        }
    },
    {
        timestamps: true
    }
);

outboxSchema.index({
    status: 1,
    createdAt: 1
});

outboxSchema.index({
    status: 1,
    nextAttemptAt: 1
});

outboxSchema.index({
    aggregateType: 1,
    aggregateId: 1
});

outboxSchema.index({
    status: 1,
    "dispatchLease.expiresAt": 1
});

const OutboxEvent = mongoose.model(
    "OutboxEvent",
    outboxSchema
);

export default OutboxEvent;