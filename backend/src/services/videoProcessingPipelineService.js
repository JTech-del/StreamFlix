"use strict";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    normalizeVideoToMp4
} from "./videoNormalizationService.js";

import Movie from "../models/Movie.js";

import {
    createProcessingArtifact
} from "./processingArtifactService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEO_STORAGE_DIRECTORY = path.resolve(
    __dirname,
    "../../storage/videos"
);

const PROCESSING_STORAGE_DIRECTORY = path.resolve(
    __dirname,
    "../../storage/processing"
);

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
    ".mp4",
    ".webm",
    ".mkv"
]);

function normalizeMovieId(movieId) {
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

    return numericMovieId;
}

function validateSourceFilename(filename) {
    if (
        typeof filename !== "string" ||
        !filename.trim()
    ) {
        const error = new Error(
            "Movie source video filename is required."
        );

        error.code = "INVALID_VIDEO_SOURCE";

        throw error;
    }

    const normalizedFilename =
        path.basename(filename);

    if (normalizedFilename !== filename) {
        const error = new Error(
            "Unsafe video source filename."
        );

        error.code = "UNSAFE_VIDEO_SOURCE";

        throw error;
    }

    const extension =
        path.extname(normalizedFilename)
            .toLowerCase();

    if (
        !SUPPORTED_VIDEO_EXTENSIONS.has(
            extension
        )
    ) {
        const error = new Error(
            `Unsupported video source extension: ${extension}`
        );

        error.code =
            "UNSUPPORTED_VIDEO_SOURCE_EXTENSION";

        throw error;
    }

    return {
        filename: normalizedFilename,
        extension
    };
}

async function resolveVideoSource(movie) {
    if (!movie.media?.video) {
        const error = new Error(
            "Movie does not have a source video."
        );

        error.code = "VIDEO_SOURCE_NOT_FOUND";

        throw error;
    }

    const source =
        validateSourceFilename(
            movie.media.video
        );

    const sourcePath = path.join(
        VIDEO_STORAGE_DIRECTORY,
        source.filename
    );

    let stats;

    try {
        stats =
            await fs.stat(sourcePath);
    } catch {
        const error = new Error(
            `Video source file not found: ${source.filename}`
        );

        error.code =
            "VIDEO_SOURCE_FILE_NOT_FOUND";

        throw error;
    }

    if (!stats.isFile()) {
        const error = new Error(
            `Video source is not a file: ${source.filename}`
        );

        error.code =
            "VIDEO_SOURCE_NOT_A_FILE";

        throw error;
    }

    return {
        filename: source.filename,
        extension: source.extension,
        path: sourcePath,
        fileSize: stats.size
    };
}

export async function prepareVideoProcessing(
    movieId,
    jobId
) {
    const numericMovieId =
        normalizeMovieId(movieId);

    if (
        typeof jobId !== "string" ||
        !jobId.trim()
    ) {
        const error = new Error(
            "Job ID is required."
        );

        error.code = "INVALID_JOB_ID";

        throw error;
    }

    const movie =
        await Movie.findOne({
            id: numericMovieId
        });

    if (!movie) {
        const error = new Error(
            "Movie not found."
        );

        error.code = "MOVIE_NOT_FOUND";

        throw error;
    }

    const source =
        await resolveVideoSource(movie);

    const workspaceName =
        path.basename(jobId);

    if (workspaceName !== jobId) {
        const error = new Error(
            "Unsafe processing job ID."
        );

        error.code = "UNSAFE_JOB_ID";

        throw error;
    }

    const workspacePath =
        path.join(
            PROCESSING_STORAGE_DIRECTORY,
            workspaceName
        );

    await fs.mkdir(
        workspacePath,
        {
            recursive: true
        }
    );

    return {
        jobId,
        movieId: movie.id,
        source,
        workspace: {
            path: workspacePath
        }
    };
}



export async function normalizePreparedVideo(
    processingContext
) {
    if (
        !processingContext ||
        typeof processingContext !== "object"
    ) {
        const error = new Error(
            "Video processing context is required."
        );

        error.code =
            "INVALID_VIDEO_PROCESSING_CONTEXT";

        throw error;
    }

    const {
        jobId,
        source,
        workspace
    } = processingContext;

    if (
        typeof jobId !== "string" ||
        !jobId.trim()
    ) {
        const error = new Error(
            "Processing job ID is required."
        );

        error.code =
            "INVALID_PROCESSING_JOB_ID";

        throw error;
    }

    if (
        !source ||
        typeof source.path !== "string"
    ) {
        const error = new Error(
            "Processing source is required."
        );

        error.code =
            "INVALID_PROCESSING_SOURCE";

        throw error;
    }

    if (
        !workspace ||
        typeof workspace.path !== "string"
    ) {
        const error = new Error(
            "Processing workspace is required."
        );

        error.code =
            "INVALID_PROCESSING_WORKSPACE";

        throw error;
    }

    const outputPath =
        path.join(
            workspace.path,
            "normalized.mp4"
        );

   const result =
    await normalizeVideoToMp4({
        inputPath: source.path,
        outputPath,
        cwd: workspace.path
    });

const outputStats =
    await fs.stat(outputPath);

if (!outputStats.isFile()) {
    const error = new Error(
        "Normalized video output is not a file."
    );

    error.code =
        "INVALID_NORMALIZED_VIDEO_OUTPUT";

    throw error;
}

const artifact =
    await createProcessingArtifact({
        jobId,
        movieId:
            processingContext.movieId,
        type: "normalized-video",
        status: "ready",
        filename: "normalized.mp4",
        path: outputPath,
        extension: ".mp4",
        format: "mp4",
        size: outputStats.size,
        metadata: {
            sourceFilename:
                source.filename,
            sourceExtension:
                source.extension
        }
    });



return {
    jobId,
    movieId: processingContext.movieId,
    source,
    workspace,
    output: {
        path: outputPath,
        filename: "normalized.mp4",
        extension: ".mp4",
        format: "mp4",
        size: outputStats.size
    },
    ffmpeg: result
};
}