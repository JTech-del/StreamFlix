"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import Job from "../../src/models/Job.js";
import OutboxEvent from "../../src/models/OutboxEvent.js";
import {
    createVideoProcessingJob
} from "../../src/services/videoProcessingService.js";

const VIDEO_STORAGE_DIRECTORY = path.resolve(
    "storage",
    "videos"
);

const TEST_SOURCE_FILE =
    "video-processing-transaction-test.mp4";

let mongoServer;

before(async () => {
    mongoServer =
        await MongoMemoryReplSet.create({
            replSet: {
                count: 1
            }
        });

    process.env.MONGODB_URI =
        mongoServer.getUri(
            "streamflix_video_processing_transaction_test"
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
        Buffer.from(
            "video-processing-transaction-test"
        )
    );
});

after(async () => {
    const testSourcePath =
        path.join(
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

async function createMovie() {
    return Movie.create({
        id: 9801,
        slug:
            "video-processing-transaction-test",
        title:
            "Video Processing Transaction Test",
        description:
            "Video processing transaction test movie.",
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
        status: "draft"
    });
}

test(
    "creates Job and OutboxEvent atomically",
    async () => {
        const movie =
            await createMovie();

        const job =
            await createVideoProcessingJob(
                movie.id
            );

        const persistedJob =
            await Job.findOne({
                jobId: job.jobId
            });

        assert.ok(persistedJob);

        assert.equal(
            persistedJob.status,
            "queued"
        );

        const outboxEvent =
            await OutboxEvent.findOne({
                aggregateId: job.jobId
            });

        assert.ok(outboxEvent);

        assert.equal(
            outboxEvent.eventType,
            "video.processing.requested"
        );

        assert.equal(
            outboxEvent.aggregateType,
            "job"
        );

        assert.equal(
            outboxEvent.aggregateId,
            job.jobId
        );

        assert.equal(
            outboxEvent.status,
            "pending"
        );

        assert.equal(
            outboxEvent.payload.jobId,
            job.jobId
        );

        assert.equal(
            outboxEvent.payload.type,
            "video-processing"
        );

        assert.equal(
            outboxEvent.payload.entityType,
            "movie"
        );

        assert.equal(
            outboxEvent.payload.entityId,
            String(movie.id)
        );

        assert.equal(
            outboxEvent.payload.metadata.sourceFilename,
            TEST_SOURCE_FILE
        );
    }
);
