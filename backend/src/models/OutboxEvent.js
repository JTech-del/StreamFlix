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

        publishedAt: {
            type: Date,
            default: null
        },

        lastAttemptAt: {
            type: Date,
            default: null
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
    aggregateType: 1,
    aggregateId: 1
});

const OutboxEvent = mongoose.model(
    "OutboxEvent",
    outboxSchema
);

export default OutboxEvent;
