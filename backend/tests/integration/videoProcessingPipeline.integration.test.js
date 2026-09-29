"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import {
    prepareVideoProcessing
} from "../../src/services/videoProcessingPipelineService.js";

const VIDEO_STORAGE_DIRECTORY =
    path.resolve(
        process.cwd(),
        "storage/videos"
    );

const PROCESSING_STORAGE_DIRECTORY =
    path.resolve(
        process.cwd(),
        "storage/processing"
    );

let mongoServer;

function createMovie(overrides = {}) {
    return new Movie({
        id: 9801,
        slug: "pipeline-test-movie",
        title: "Pipeline Test Movie",
        description: "Video processing pipeline test.",
        year: 2026,
        duration: "120 min",
        rating: "PG-13",
        media: {
            video: "movie-001.mp4",
            trailer: null,
            poster: null,
            backdrop: null,
            background: null,
            logo: null
        },
        ...overrides
    });
}

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-video-pipeline-test"
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

test.after(async () => {
    await fs.rm(
        PROCESSING_STORAGE_DIRECTORY,
        {
            recursive: true,
            force: true
        }
    );

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await Movie.deleteMany({});
});

test(
    "valid movie source creates processing context and workspace",
    async () => {
        const movie =
            createMovie();

        await movie.save();

        const jobId =
            "pipeline-test-job-001";

        const result =
            await prepareVideoProcessing(
                movie.id,
                jobId
            );

        assert.equal(
            result.jobId,
            jobId
        );

        assert.equal(
            result.movieId,
            movie.id
        );

        assert.equal(
            result.source.filename,
            "movie-001.mp4"
        );

        assert.equal(
            result.source.extension,
            ".mp4"
        );

        assert.ok(
            result.source.path.endsWith(
                path.join(
                    "storage",
                    "videos",
                    "movie-001.mp4"
                )
            )
        );

        assert.ok(
            result.source.fileSize > 0
        );

        assert.ok(
            result.workspace.path.endsWith(
                path.join(
                    "storage",
                    "processing",
                    jobId
                )
            )
        );

        const workspaceStats =
            await fs.stat(
                result.workspace.path
            );

        assert.equal(
            workspaceStats.isDirectory(),
            true
        );
    }
);

test(
    "movie without source video is rejected",
    async () => {
        const movie =
            createMovie({
                id: 9802,
                slug:
                    "pipeline-no-video",
                media: {
                    video: null
                }
            });

        await movie.save();

        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    movie.id,
                    "pipeline-test-job-002"
                ),
            {
                code:
                    "VIDEO_SOURCE_NOT_FOUND"
            }
        );
    }
);

test(
    "missing movie is rejected",
    async () => {
        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    99999,
                    "pipeline-test-job-003"
                ),
            {
                code:
                    "MOVIE_NOT_FOUND"
            }
        );
    }
);

test(
    "invalid movie ID is rejected",
    async () => {
        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    "invalid",
                    "pipeline-test-job-004"
                ),
            {
                code:
                    "INVALID_MOVIE_ID"
            }
        );
    }
);

test(
    "missing job ID is rejected",
    async () => {
        const movie =
            createMovie({
                id: 9803,
                slug:
                    "pipeline-invalid-job"
            });

        await movie.save();

        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    movie.id,
                    ""
                ),
            {
                code:
                    "INVALID_JOB_ID"
            }
        );
    }
);

test(
    "unsafe source filename is rejected",
    async () => {
        const movie =
            createMovie({
                id: 9804,
                slug:
                    "pipeline-unsafe-source",
                media: {
                    video:
                        "../videos/movie-001.mp4"
                }
            });

        await movie.save();

        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    movie.id,
                    "pipeline-test-job-005"
                ),
            {
                code:
                    "UNSAFE_VIDEO_SOURCE"
            }
        );
    }
);

test(
    "missing physical source file is rejected",
    async () => {
        const movie =
            createMovie({
                id: 9805,
                slug:
                    "pipeline-missing-source",
                media: {
                    video:
                        "does-not-exist.mp4"
                }
            });

        await movie.save();

        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    movie.id,
                    "pipeline-test-job-006"
                ),
            {
                code:
                    "VIDEO_SOURCE_FILE_NOT_FOUND"
            }
        );
    }
);

test(
    "unsupported source extension is rejected",
    async () => {
        const movie =
            createMovie({
                id: 9806,
                slug:
                    "pipeline-unsupported-source",
                media: {
                    video:
                        "movie-001.txt"
                }
            });

        await movie.save();

        await assert.rejects(
            () =>
                prepareVideoProcessing(
                    movie.id,
                    "pipeline-test-job-007"
                ),
            {
                code:
                    "UNSUPPORTED_VIDEO_SOURCE_EXTENSION"
            }
        );
    }
);
