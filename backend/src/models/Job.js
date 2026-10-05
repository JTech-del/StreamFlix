"use strict";

import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const jobSchema = new mongoose.Schema(
    {
        jobId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: () => randomUUID(),
            trim: true
        },

        type: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        status: {
            type: String,
            required: true,
            enum: [
                "queued",
                "processing",
                "completed",
                "failed",
                "retrying",
                "dead-lettered"
            ],
            default: "queued",
            index: true
        },

        entityType: {
            type: String,
            default: null,
            trim: true,
            index: true
        },

        entityId: {
            type: String,
            default: null,
            trim: true,
            index: true
        },

        attempt: {
            type: Number,
            default: 0,
            min: 0
        },

        maxAttempts: {
            type: Number,
            default: 5,
            min: 1
        },

        startedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        failedAt: {
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

            stack: {
                type: String,
                default: null
            },

            occurredAt: {
                type: Date,
                default: null
            }
        },

        correlationId: {
            type: String,
            default: null,
            index: true,
            trim: true
        },

        worker: {
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

dispatch: {
    type: new mongoose.Schema(
        {
            attempt: {
                type: Number,
                default: null,
                min: 0
            },
            status: {
                type: String,
                enum: ["pending", "published"],
                default: "pending"
            },
            publishedAt: {
                type: Date,
                default: null
            }
        },
        { _id: false }
    ),
    default: () => ({
        attempt: null,
        status: "pending",
        publishedAt: null
    })
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
},

processingLease: {
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
},

  metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

jobSchema.index({
    status: 1,
    nextAttemptAt: 1
});

jobSchema.index({
    entityType: 1,
    entityId: 1
});

jobSchema.index({
    status: 1,
    "dispatchLease.expiresAt": 1
});

jobSchema.index({
    status: 1,
    type: 1,
    "processingLease.expiresAt": 1
});

const Job = mongoose.model("Job", jobSchema);

export default Job;
