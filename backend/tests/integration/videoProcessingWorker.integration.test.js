"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";


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


import mongoose from "mongoose";
import { MongoMemoryServer} from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import Job from "../../src/models/Job.js";
import {  createJob} from "../../src/services/jobService.js";


import {
    processVideoProcessingMessage
} from "../../src/workers/videoProcessingWorker.js";


let mongoServer;

function createRabbitMessage(payload) {
    return {
        content: Buffer.from(
            JSON.stringify(payload)
        )
    };
}

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName: "streamflix-worker-test"
        }
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await Job.deleteMany({});
    await Movie.deleteMany({});
});


test(
    "valid video processing message claims and processes queued job",
    async () => {
        const sourcePath = path.join(
            VIDEO_STORAGE_DIRECTORY,
            "worker-test.mp4"
        );

        await fs.mkdir(
            VIDEO_STORAGE_DIRECTORY,
            {
                recursive: true
            }
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

        await Movie.create({
            id: 9801,
            slug: "worker-test",
            title: "Worker Test",
            description:
                "Synthetic video used for worker testing.",
            year: 2026,
            duration: "1 minute",
            rating: "Not Rated",
            media: {
                video: "worker-test.mp4"
            },
            genres: [],
            status: "draft"
        });

        const job = await createJob({
            type: "video-processing",
            entityType: "movie",
            entityId: "9801"
        });

        const result =
            await processVideoProcessingMessage(
                createRabbitMessage({
                    jobId: job.jobId,
                    type: "video-processing",
                    entityType: "movie",
                    entityId: "9801",
                    metadata: {}
                })
            );

        assert.equal(
            result.acknowledged,
            true
        );

        assert.equal(
            result.claimed,
            true
        );

        assert.equal(
            result.jobId,
            job.jobId
        );

        assert.equal(
            result.status,
            "processed"
        );

        assert.equal(
            result.processing.output.filename,
            "normalized.mp4"
        );

        const updatedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(
            updatedJob
        );

        assert.equal(
            updatedJob.status,
            "completed"
        );

        assert.ok(
            updatedJob.completedAt
        );

        assert.equal(
            updatedJob.nextAttemptAt,
            null
        );

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
    }
);

test(
    "already completed job is not claimed again",
    async () => {
        const sourcePath = path.join(
            VIDEO_STORAGE_DIRECTORY,
            "worker-test-9802.mp4"
        );

        await fs.mkdir(
            VIDEO_STORAGE_DIRECTORY,
            {
                recursive: true
            }
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

        await Movie.create({
            id: 9802,
            slug: "worker-test-9802",
            title: "Worker Test 9802",
            description:
                "Synthetic video used for duplicate delivery testing.",
            year: 2026,
            duration: "1 minute",
            rating: "Not Rated",
            media: {
                video: "worker-test-9802.mp4"
            },
            genres: [],
            status: "draft"
        });

        const job = await createJob({
            type: "video-processing",
            entityType: "movie",
            entityId: "9802"
        });

        const message =
            createRabbitMessage({
                jobId: job.jobId,
                type: "video-processing"
            });

        const firstResult =
            await processVideoProcessingMessage(
                message
            );

        const secondResult =
            await processVideoProcessingMessage(
                message
            );

        assert.equal(
            firstResult.claimed,
            true
        );

        assert.equal(
            firstResult.status,
            "processed"
        );

        assert.equal(
            secondResult.claimed,
            false
        );

        assert.equal(
            secondResult.acknowledged,
            true
        );

        const updatedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.equal(
            updatedJob.status,
            "completed"
        );

        assert.ok(
            updatedJob.completedAt
        );

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
    }
);

test(
    "invalid JSON message is rejected",
    async () => {
        const message = {
            content: Buffer.from(
                "{invalid-json"
            )
        };

        await assert.rejects(
            () =>
                processVideoProcessingMessage(
                    message
                ),
            {
                code:
                    "INVALID_VIDEO_PROCESSING_MESSAGE"
            }
        );
    }
);

test(
    "message without jobId is rejected",
    async () => {
        await assert.rejects(
            () =>
                processVideoProcessingMessage(
                    createRabbitMessage({
                        type:
                            "video-processing"
                    })
                ),
            {
                code:
                    "MISSING_VIDEO_PROCESSING_JOB_ID"
            }
        );
    }
);

test(
    "unsupported job type is rejected",
    async () => {
        await assert.rejects(
            () =>
                processVideoProcessingMessage(
                    createRabbitMessage({
                        jobId:
                            "unsupported-job",
                        type:
                            "unknown-processing-type"
                    })
                ),
            {
                code:
                    "UNSUPPORTED_VIDEO_PROCESSING_JOB"
            }
        );
    }
);