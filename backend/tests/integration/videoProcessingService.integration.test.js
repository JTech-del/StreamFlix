"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import Job from "../../src/models/Job.js";
import {
    createVideoProcessingJob
} from "../../src/services/videoProcessingService.js";

const VIDEO_STORAGE_DIRECTORY = path.resolve(
    "storage",
    "videos"
);

const TEST_SOURCE_FILE = "video-processing-test.mp4";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri(
        "streamflix_video_processing_test"
    );

    await mongoose.connect(
        process.env.MONGODB_URI
    );

    fs.mkdirSync(
        VIDEO_STORAGE_DIRECTORY,
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        path.join(
            VIDEO_STORAGE_DIRECTORY,
            TEST_SOURCE_FILE
        ),
        Buffer.from("video-processing-test")
    );
});

after(async () => {
    const testSourcePath = path.join(
        VIDEO_STORAGE_DIRECTORY,
        TEST_SOURCE_FILE
    );

    if (fs.existsSync(testSourcePath)) {
        fs.unlinkSync(testSourcePath);
    }

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

async function createMovie(overrides = {}) {
    return Movie.create({
        id: 9701,
        slug: "video-processing-test-movie",
        title: "Video Processing Test Movie",
        description: "Video processing foundation test movie.",
        year: 2026,
        duration: "100 min",
        rating: "PG",
        imdb: 7.0,
        quality: "HD",
        genres: ["Drama"],
        media: {
            video: TEST_SOURCE_FILE,
            trailer: null,
            poster: null,
            backdrop: null,
            background: null,
            logo: null
        },
        status: "draft",
        ...overrides
    });
}

test(
    "creates a video processing job for a valid draft movie",
    async () => {
        const movie = await createMovie();

        const job =
            await createVideoProcessingJob(
                movie.id
            );

        assert.equal(
            job.type,
            "video-processing"
        );

        assert.equal(
            job.status,
            "queued"
        );

        assert.equal(
            job.entityType,
            "movie"
        );

        assert.equal(
            job.entityId,
            String(movie.id)
        );

        assert.equal(
            job.metadata.movieId,
            movie.id
        );

        assert.equal(
            job.metadata.sourceFilename,
            TEST_SOURCE_FILE
        );

        assert.equal(
            job.metadata.sourceExtension,
            ".mp4"
        );

        assert.equal(
            job.metadata.sourceSize,
            Buffer.byteLength(
                "video-processing-test"
            )
        );
    }
);

test(
    "creates a persisted video processing job",
    async () => {
        await createMovie({
            id: 9702,
            slug: "video-processing-persisted"
        });

        const job =
            await createVideoProcessingJob(
                9702
            );

        const persistedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(persistedJob);

        assert.equal(
            persistedJob.type,
            "video-processing"
        );

        assert.equal(
            persistedJob.entityType,
            "movie"
        );

        assert.equal(
            persistedJob.entityId,
            "9702"
        );

        assert.equal(
            persistedJob.status,
            "queued"
        );
    }
);

test(
    "rejects an invalid movie ID",
    async () => {
        await assert.rejects(
            () =>
                createVideoProcessingJob(
                    "invalid"
                ),
            {
                code: "INVALID_MOVIE_ID",
                message: "Invalid movie ID."
            }
        );
    }
);

test(
    "rejects a missing movie",
    async () => {
        await assert.rejects(
            () =>
                createVideoProcessingJob(
                    999999
                ),
            {
                code: "MOVIE_NOT_FOUND",
                message: "Movie not found."
            }
        );
    }
);

test(
    "rejects a movie without a source video",
    async () => {
        await createMovie({
            id: 9703,
            slug: "video-processing-no-source",
            media: {
                video: null
            }
        });

        await assert.rejects(
            () =>
                createVideoProcessingJob(
                    9703
                ),
            {
                code: "SOURCE_VIDEO_MISSING",
                message: "Movie has no source video."
            }
        );
    }
);

test(
    "rejects an unsafe source video path",
    async () => {
        await createMovie({
            id: 9704,
            slug: "video-processing-unsafe-source",
            media: {
                video: "../outside.mp4"
            }
        });

        await assert.rejects(
            () =>
                createVideoProcessingJob(
                    9704
                ),
            {
                code: "SOURCE_VIDEO_INVALID",
                message:
                    "Source video file not found or unsupported."
            }
        );
    }
);

test(
    "rejects a missing source video file",
    async () => {
        await createMovie({
            id: 9705,
            slug: "video-processing-missing-file",
            media: {
                video: "does-not-exist.mp4"
            }
        });

        await assert.rejects(
            () =>
                createVideoProcessingJob(
                    9705
                ),
            {
                code: "SOURCE_VIDEO_INVALID",
                message:
                    "Source video file not found or unsupported."
            }
        );
    }
);

test(
    "rejects an unsupported source video extension",
    async () => {
        await createMovie({
            id: 9706,
            slug: "video-processing-unsupported",
            media: {
                video: "unsupported.txt"
            }
        });

        const unsupportedPath = path.join(
            VIDEO_STORAGE_DIRECTORY,
            "unsupported.txt"
        );

        fs.writeFileSync(
            unsupportedPath,
            Buffer.from("unsupported")
        );

        try {
            await assert.rejects(
                () =>
                    createVideoProcessingJob(
                        9706
                    ),
                {
                    code: "SOURCE_VIDEO_INVALID",
                    message:
                        "Source video file not found or unsupported."
                }
            );
        } finally {
            if (fs.existsSync(unsupportedPath)) {
                fs.unlinkSync(unsupportedPath);
            }
        }
    }
);
