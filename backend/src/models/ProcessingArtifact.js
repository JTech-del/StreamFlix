"use strict";

import mongoose from "mongoose";

const processingArtifactSchema =
    new mongoose.Schema(
        {
            artifactId: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true
            },

            jobId: {
                type: String,
                required: true,
                index: true,
                trim: true
            },

            movieId: {
                type: Number,
                required: true,
                index: true,
                min: 1
            },

            type: {
                type: String,
                required: true,
                enum: [
                    "normalized-video",
                    "hls-master",
                    "hls-variant",
                    "thumbnail",
                    "subtitle"
                ],
                index: true
            },

            status: {
                type: String,
                required: true,
                enum: [
                    "created",
                    "ready",
                    "failed",
                    "deleted"
                ],
                default: "created",
                index: true
            },

            filename: {
                type: String,
                required: true,
                trim: true
            },

            path: {
                type: String,
                required: true,
                trim: true
            },

            extension: {
                type: String,
                required: true,
                trim: true
            },

            format: {
                type: String,
                required: true,
                trim: true
            },

            size: {
                type: Number,
                required: true,
                min: 0
            },

            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },

            createdAt: {
                type: Date,
                default: Date.now
            },

            readyAt: {
                type: Date,
                default: null
            },

            deletedAt: {
                type: Date,
                default: null
            }
        },
        {
            timestamps: true
        }
    );

processingArtifactSchema.index({
    jobId: 1,
    type: 1
});

processingArtifactSchema.index({
    movieId: 1,
    type: 1,
    status: 1
});

const ProcessingArtifact =
    mongoose.model(
        "ProcessingArtifact",
        processingArtifactSchema
    );

export default ProcessingArtifact;