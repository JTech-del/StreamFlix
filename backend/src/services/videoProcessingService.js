"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import Movie from "../models/Movie.js";
import { createJob } from "./jobService.js";
import { createOutboxEvent } from "./outboxService.js";


/*==================================================
    Module Paths
==================================================*/

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);


/*==================================================
    Backend Storage
==================================================*/

const BACKEND_ROOT = path.resolve(
    __dirname,
    "../.."
);

const VIDEO_STORAGE_DIRECTORY = path.join(
    BACKEND_ROOT,
    "storage",
    "videos"
);


/*==================================================
    Supported Source Video Types
==================================================*/

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
    ".mp4",
    ".webm",
    ".mkv"
]);


/*==================================================
    Resolve Source Video
==================================================*/

function resolveSourceVideo(fileName) {
    if (
        !fileName ||
        typeof fileName !== "string"
    ) {
        return null;
    }

    const safeFilename = path.basename(fileName);

    if (safeFilename !== fileName) {
        return null;
    }

    const extension = path.extname(
        safeFilename
    ).toLowerCase();

    if (!SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
        return null;
    }

    const filePath = path.join(
        VIDEO_STORAGE_DIRECTORY,
        safeFilename
    );

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
        return null;
    }

    return {
        filename: safeFilename,
        filePath,
        fileSize: stats.size,
        extension
    };
}


/*==================================================
    Create Video Processing Job
==================================================*/

export async function createVideoProcessingJob(
    movieId
) {
    const numericMovieId = Number(movieId);

    if (
        !Number.isInteger(numericMovieId) ||
        numericMovieId < 1
    ) {
        const error = new Error(
            "Invalid movie ID."
        );

        error.code = "INVALID_MOVIE_ID";

        throw error;
    }

    const movie = await Movie.findOne({
        id: numericMovieId
    });

    if (!movie) {
        const error = new Error(
            "Movie not found."
        );

        error.code = "MOVIE_NOT_FOUND";

        throw error;
    }

    const sourceFilename =
        movie.media?.video ?? null;

    if (!sourceFilename) {
        const error = new Error(
            "Movie has no source video."
        );

        error.code = "SOURCE_VIDEO_MISSING";

        throw error;
    }

    const sourceVideo =
        resolveSourceVideo(
            sourceFilename
        );

    if (!sourceVideo) {
        const error = new Error(
            "Source video file not found or unsupported."
        );

        error.code = "SOURCE_VIDEO_INVALID";

        throw error;
    }


const session = await mongoose.startSession();

let job;

try {
    await session.withTransaction(async () => {
        job = await createJob({
            type: "video-processing",
            entityType: "movie",
            entityId: String(movie.id),
            metadata: {
                movieId: movie.id,
                sourceFilename: sourceVideo.filename,
                sourceExtension: sourceVideo.extension,
                sourceSize: sourceVideo.fileSize
            },
            session
        });

        await createOutboxEvent({
            eventType: "video.processing.requested",
            aggregateType: "job",
            aggregateId: job.jobId,
            payload: {
                jobId: job.jobId,
                type: job.type,
                entityType: job.entityType,
                entityId: job.entityId,
                correlationId: job.correlationId,
                metadata: job.metadata
            },
            session
        });
    });

    return job;
} finally {
    await session.endSession();
}
    return job;
}
