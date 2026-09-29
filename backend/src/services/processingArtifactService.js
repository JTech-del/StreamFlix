"use strict";

import { randomUUID } from "node:crypto";

import ProcessingArtifact from "../models/ProcessingArtifact.js";

export async function createProcessingArtifact({
    jobId,
    movieId,
    type,
    status = "created",
    filename,
    path,
    extension,
    format,
    size,
    metadata = {},
    session = null
}) {
    if (
        typeof jobId !== "string" ||
        !jobId.trim()
    ) {
        throw new Error(
            "Processing artifact job ID is required."
        );
    }

    if (
        !Number.isInteger(movieId) ||
        movieId < 1
    ) {
        throw new Error(
            "Processing artifact movie ID is invalid."
        );
    }

    if (
        typeof filename !== "string" ||
        !filename.trim()
    ) {
        throw new Error(
            "Processing artifact filename is required."
        );
    }

    if (
        typeof path !== "string" ||
        !path.trim()
    ) {
        throw new Error(
            "Processing artifact path is required."
        );
    }

    if (
        typeof extension !== "string" ||
        !extension.trim()
    ) {
        throw new Error(
            "Processing artifact extension is required."
        );
    }

    if (
        typeof format !== "string" ||
        !format.trim()
    ) {
        throw new Error(
            "Processing artifact format is required."
        );
    }

    if (
        !Number.isFinite(size) ||
        size < 0
    ) {
        throw new Error(
            "Processing artifact size is invalid."
        );
    }

    const artifact =
        new ProcessingArtifact({
            artifactId: randomUUID(),
            jobId,
            movieId,
            type,
            status,
            filename,
            path,
            extension,
            format,
            size,
            metadata
        });

    if (session) {
        await artifact.save({
            session
        });
    } else {
        await artifact.save();
    }

    return artifact;
}