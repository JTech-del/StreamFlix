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
import {
    prepareVideoProcessing,
    normalizePreparedVideo
} from "../../src/services/videoProcessingPipelineService.js";

import ProcessingArtifact from "../../src/models/ProcessingArtifact.js";


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
        "pipeline-normalization-test.mp4"
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
    "pipeline prepares source and normalizes it into the processing workspace",
    async () => {
        await Movie.create({
            id: 9810,
            slug: "pipeline-normalization-test",
            title: "Pipeline Normalization Test",
            description:
                "Synthetic video used for pipeline normalization testing.",
            year: 2026,
            duration: "1 minute",
            rating: "Not Rated",
            media: {
                video:
                    "pipeline-normalization-test.mp4"
            },
            genres: [],
            status: "draft"
        });

        const context =
            await prepareVideoProcessing(
                9810,
                "pipeline-normalization-job"
            );

        const result =
            await normalizePreparedVideo(
                context
            );

        const outputStats =
            await fs.stat(
                result.output.path
            );

        assert.equal(
            result.jobId,
            "pipeline-normalization-job"
        );

        assert.equal(
            result.movieId,
            9810
        );

        assert.equal(
            result.output.filename,
            "normalized.mp4"
        );

        assert.equal(
            path.basename(
                result.output.path
            ),
            "normalized.mp4"
        );

        assert.ok(
            outputStats.isFile()
        );

        assert.ok(
            outputStats.size > 0
        );
const artifact =
    await ProcessingArtifact.findOne({
        jobId:
            "pipeline-normalization-job",
        type: "normalized-video"
    });

assert.ok(
    artifact
);

assert.equal(
    artifact.movieId,
    9810
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
    artifact.format,
    "mp4"
);

assert.equal(
    artifact.extension,
    ".mp4"
);

assert.equal(
    artifact.size,
    outputStats.size
);

assert.equal(
    artifact.metadata.sourceFilename,
    "pipeline-normalization-test.mp4"
);

    }

);