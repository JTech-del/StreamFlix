"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import ProcessingArtifact from "../../src/models/ProcessingArtifact.js";
import {
    createProcessingArtifact
} from "../../src/services/processingArtifactService.js";

let mongoServer;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "creates a processing artifact",
    async () => {
        const artifact =
            await createProcessingArtifact({
                jobId:
                    "artifact-test-job",
                movieId: 9820,
                type:
                    "normalized-video",
                status: "ready",
                filename:
                    "normalized.mp4",
                path:
                    "storage/processing/artifact-test-job/normalized.mp4",
                extension: ".mp4",
                format: "mp4",
                size: 123456,
                metadata: {
                    sourceFilename:
                        "movie-001.mp4"
                }
            });

        assert.ok(
            artifact.artifactId
        );

        assert.equal(
            artifact.jobId,
            "artifact-test-job"
        );

        assert.equal(
            artifact.movieId,
            9820
        );

        assert.equal(
            artifact.type,
            "normalized-video"
        );

        assert.equal(
            artifact.status,
            "ready"
        );

        assert.equal(
            artifact.filename,
            "normalized.mp4"
        );

        assert.equal(
            artifact.extension,
            ".mp4"
        );

        assert.equal(
            artifact.format,
            "mp4"
        );

        assert.equal(
            artifact.size,
            123456
        );

        assert.equal(
            artifact.metadata
                .sourceFilename,
            "movie-001.mp4"
        );

        const storedArtifact =
            await ProcessingArtifact.findOne({
                artifactId:
                    artifact.artifactId
            });

        assert.ok(
            storedArtifact
        );

        assert.equal(
            storedArtifact.jobId,
            "artifact-test-job"
        );
    }
);