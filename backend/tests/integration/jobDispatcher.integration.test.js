"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import {
    dispatchJob,
    getJobPublisher
} from "../../src/services/jobDispatcher.js";

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

test.beforeEach(async () => {
    await Job.deleteMany({});
});

test(
    "resolves the notification publisher",
    () => {
        const publisher =
            getJobPublisher("notification");

        assert.equal(
            typeof publisher,
            "function"
        );
    }
);

test(
    "resolves the video processing publisher",
    () => {
        const publisher =
            getJobPublisher(
                "video-processing"
            );

        assert.equal(
            typeof publisher,
            "function"
        );
    }
);

test(
    "rejects unsupported job types",
    () => {
        assert.throws(
            () =>
                getJobPublisher(
                    "unsupported-job"
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "UNSUPPORTED_JOB_TYPE"
                );

                return true;
            }
        );
    }
);

test(
    "rejects a missing job",
    async () => {
        await assert.rejects(
            () => dispatchJob(null),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_JOB"
                );

                return true;
            }
        );
    }
);

test(
    "rejects a job without a jobId",
    async () => {
        await assert.rejects(
            () =>
                dispatchJob({
                    type: "notification",
                    status: "queued"
                }),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_JOB"
                );

                return true;
            }
        );
    }
);

test(
    "rejects a non-queued job",
    async () => {
        const job = await Job.create({
            type: "notification",
            entityType: "movie",
            entityId: "movie-dispatch-001",
            status: "processing"
        });

        await assert.rejects(
            () => dispatchJob(job),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_JOB_DISPATCH_STATUS"
                );

                return true;
            }
        );
    }
);
