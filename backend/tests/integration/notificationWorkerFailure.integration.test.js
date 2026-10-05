"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import {
    MongoMemoryServer
} from "mongodb-memory-server";

import Job from "../../src/models/Job.js";

import {
    processNotificationMessage
} from "../../src/workers/notificationWorker.js";

let mongoServer;

test.before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-worker-failure-test"
        }
    );
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test(
    "notification worker moves a failed job into retrying state",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "notification-worker-retry-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-retry-1",
                status:
                    "queued",
                attempt:
                    0,
                maxAttempts:
                    3,
                correlationId:
                    "notification-worker-retry-test",
                metadata: {
                    eventType:
                        "unsupported.event",
                    recipientUserId:
                        new mongoose.Types.ObjectId()
                            .toString()
                }
            });

        const message = {
            content:
                Buffer.from(
                    JSON.stringify({
                        jobId:
                            job.jobId,
                        type:
                            "notification"
                    })
                )
        };

        const result =
            await processNotificationMessage(
                message
            );

        assert.equal(
            result.claimed,
            true
        );

        assert.equal(
            result.status,
            "retrying"
        );

        assert.equal(
            result.attempt,
            1
        );

        const storedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "retrying"
        );

        assert.equal(
            storedJob.attempt,
            1
        );

        assert.ok(
            storedJob.nextAttemptAt
        );

        assert.equal(
            storedJob.lastError.code,
            "UNSUPPORTED_NOTIFICATION_EVENT_TYPE"
        );
    }
);

test(
    "notification worker dead-letters a job when retry budget is exhausted",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "notification-worker-dead-letter-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-dead-letter-1",
                status:
                    "queued",
                attempt:
                    3,
                maxAttempts:
                    3,
                correlationId:
                    "notification-worker-dead-letter-test",
                metadata: {
                    eventType:
                        "unsupported.event",
                    recipientUserId:
                        new mongoose.Types.ObjectId()
                            .toString()
                }
            });

        const message = {
            content:
                Buffer.from(
                    JSON.stringify({
                        jobId:
                            job.jobId,
                        type:
                            "notification"
                    })
                )
        };

        const result =
            await processNotificationMessage(
                message
            );

        assert.equal(
            result.claimed,
            true
        );

        assert.equal(
            result.status,
            "dead-lettered"
        );

        const storedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "dead-lettered"
        );

        assert.equal(
            storedJob.attempt,
            3
        );

        assert.equal(
            storedJob.lastError.code,
            "UNSUPPORTED_NOTIFICATION_EVENT_TYPE"
        );
    }
);


test(
    "notification worker preserves failed state when retry scheduling fails",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "notification-worker-retry-bookkeeping-failure-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-retry-bookkeeping-failure-1",
                status:
                    "queued",
                attempt:
                    0,
                maxAttempts:
                    3,
                correlationId:
                    "notification-worker-retry-bookkeeping-failure-test",
                metadata: {
                    eventType:
                        "unsupported.event",
                    recipientUserId:
                        new mongoose.Types.ObjectId()
                            .toString()
                }
            });

        const message = {
            content:
                Buffer.from(
                    JSON.stringify({
                        jobId:
                            job.jobId,
                        type:
                            "notification"
                    })
                )
        };

        const expectedRetryError =
            new Error(
                "Simulated retry scheduling failure."
            );

        const result =
            await processNotificationMessage(
                message,
                "notification-worker-test",
                {
                    retryJobOperation:
                        async () => {
                            throw expectedRetryError;
                        }
                }
            );

        assert.equal(
            result.claimed,
            true
        );

        assert.equal(
            result.status,
            "failed"
        );

        assert.equal(
            result.retrySchedulingFailed,
            true
        );

        const storedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "failed"
        );

        assert.equal(
            storedJob.attempt,
            0
        );

        assert.equal(
            storedJob.lastError.code,
            "UNSUPPORTED_NOTIFICATION_EVENT_TYPE"
        );

        assert.ok(
            storedJob.failedAt
        );
    }
);

test(
    "notification worker does not acknowledge failure when failure persistence fails",
    async () => {
        const job =
            await Job.create({
                jobId:
                    "notification-worker-failure-persistence-1",
                type:
                    "notification",
                entityType:
                    "movie",
                entityId:
                    "movie-failure-persistence-1",
                status:
                    "queued",
                attempt:
                    0,
                maxAttempts:
                    3,
                correlationId:
                    "notification-worker-failure-persistence-test",
                metadata: {
                    eventType:
                        "unsupported.event",
                    recipientUserId:
                        new mongoose.Types.ObjectId()
                            .toString()
                }
            });

        const message = {
            content:
                Buffer.from(
                    JSON.stringify({
                        jobId:
                            job.jobId,
                        type:
                            "notification"
                    })
                )
        };

        const expectedFailure =
            new Error(
                "Simulated failure persistence error."
            );

        await assert.rejects(
            () =>
                processNotificationMessage(
                    message,
                    "notification-worker-test",
                    {
                        failJobOperation:
                            async () => {
                                throw expectedFailure;
                            }
                    }
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "NOTIFICATION_FAILURE_PERSISTENCE_FAILED"
                );

                assert.equal(
                    error.cause,
                    expectedFailure
                );

                return true;
            }
        );

        const storedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            }).lean();

        assert.equal(
            storedJob.status,
            "processing"
        );
    }
);
