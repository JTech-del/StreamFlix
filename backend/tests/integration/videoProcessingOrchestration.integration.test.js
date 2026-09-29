"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import Job from "../../src/models/Job.js";
import ProcessingArtifact from "../../src/models/ProcessingArtifact.js";

import {
    processVideoJob
} from "../../src/services/videoProcessingOrchestrationService.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIRECTORY = path.resolve(
    __dirname,
    "../.."
);

const VIDEO_STORAGE_DIRECTORY = path.join(
    BACKEND_DIRECTORY,
    "storage",
    "videos"
);

const PROCESSING_STORAGE_DIRECTORY = path.join(
    BACKEND_DIRECTORY,
    "storage",
    "processing"
);

let mongoServer;
let sourcePath;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );

    await fs.mkdir(
        VIDEO_STORAGE_DIRECTORY,
        {
            recursive: true
        }
    );

    sourcePath = path.join(
        VIDEO_STORAGE_DIRECTORY,
        "orchestration-test.mp4"
    );

    await execFileAsync(
        "ffmpeg",
        [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=320x180:r=24",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            sourcePath
        ]
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }

    await fs.rm(
        sourcePath,
        {
            force: true
        }
    );

    await fs.rm(
        PROCESSING_STORAGE_DIRECTORY,
        {
            recursive: true,
            force: true
        }
    );
});

test(
    "processes a claimed video job through the orchestration service",
    async () => {
        await Movie.create({
            id: 9830,
            slug: "orchestration-test",
            title: "Orchestration Test",
            description:
                "Synthetic video used for orchestration testing.",
            year: 2026,
            duration: "1 minute",
            rating: "Not Rated",
            media: {
                video:
                    "orchestration-test.mp4"
            },
            genres: [],
            status: "draft"
        });

        const job =
            await Job.create({
                type: "video-processing",
                entityType: "movie",
                entityId: "9830",
                status: "processing",
                attempt: 0,
                maxAttempts: 3,
                metadata: {
                    movieId: 9830
                }
            });

        const result =
            await processVideoJob(
                job.jobId
            );

        assert.equal(
            result.jobId,
            job.jobId
        );

        assert.equal(
            result.movieId,
            9830
        );

        assert.equal(
            result.status,
            "processed"
        );

        assert.equal(
            result.processing.output.filename,
            "normalized.mp4"
        );

        const artifact =
            await ProcessingArtifact.findOne({
                jobId: job.jobId,
                type: "normalized-video"
            });

        assert.ok(
            artifact
        );

        assert.equal(
            artifact.movieId,
            9830
        );

        assert.equal(
            artifact.status,
            "ready"
        );

        assert.ok(
            artifact.size > 0
        );

        const storedJob =
    await Job.findOne({
        jobId: job.jobId
    });

assert.ok(
    storedJob
);

assert.equal(
    storedJob.status,
    "completed"
);

assert.ok(
    storedJob.completedAt
);

assert.equal(
    storedJob.nextAttemptAt,
    null
);
    }
);