"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../../src/models/User.js";
import Job from "../../src/models/Job.js";
import Notification from "../../src/models/Notification.js";

import {
    createJob
} from "../../src/services/jobService.js";

import {
    processNotificationMessage
} from "../../src/workers/notificationWorker.js";


let mongoServer;


function createRabbitMessage(payload) {

    return {
        content: Buffer.from(
            JSON.stringify(payload)
        )
    };
}


async function createTestUser(email) {

    return User.create({
        email,
        passwordHash:
            "test-password-hash"
    });
}


test.before(async () => {

    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri(),
        {
            dbName:
                "streamflix-notification-worker-test"
        }
    );

    await Promise.all([
        User.init(),
        Job.init(),
        Notification.init()
    ]);
});


test.afterEach(async () => {

    await Promise.all([
        User.deleteMany({}),
        Job.deleteMany({}),
        Notification.deleteMany({})
    ]);
});


test.after(async () => {

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});


test(
    "valid notification message claims job and creates notification",
    async () => {

        const user =
            await createTestUser(
                "worker-user@example.com"
            );

        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1001",

                correlationId:
                    "event-movie-1001",

                metadata: {
                    eventId:
                        "event-movie-1001",

                    eventType:
                        "movie.published",

                    movieId:
                        "1001",

                    movieMongoId:
                        "movie-mongo-1001",

                    title:
                        "Worker Test Movie",

                    slug:
                        "worker-test-movie",

                    recipientUserId:
                        user._id.toString()
                }
            });


        const result =
            await processNotificationMessage(
                createRabbitMessage({
                    jobId:
                        job.jobId,

                    type:
                        "notification",

                    entityType:
                        "movie",

                    entityId:
                        "movie-mongo-1001",

                    correlationId:
                        "event-movie-1001",

                    metadata:
                        job.metadata
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
            result.dedupeKey,
            `movie.published:1001:${user._id}`
        );


        assert.ok(
            result.notificationId
        );


        const notification =
            await Notification.findOne({
                notificationId:
                    result.notificationId
            });


        assert.ok(
            notification
        );

        assert.equal(
            notification.recipientUserId.toString(),
            user._id.toString()
        );

        assert.equal(
            notification.type,
            "movie.published"
        );

        assert.equal(
            notification.title,
            "New movie published"
        );

        assert.equal(
            notification.message,
            "Worker Test Movie is now available."
        );

        assert.equal(
            notification.link,
            "/movies/worker-test-movie"
        );

        assert.equal(
            notification.dedupeKey,
            result.dedupeKey
        );


        const updatedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });


        assert.ok(
            updatedJob
        );

        /*
            This assertion intentionally verifies the
            expected worker lifecycle.

            If the current worker leaves the Job in
            "processing", this test will expose it.
        */
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
    }
);


test(
    "already claimed notification job is not processed again",
    async () => {

        const user =
            await createTestUser(
                "duplicate-worker@example.com"
            );

        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1002",

                correlationId:
                    "event-movie-1002",

                metadata: {
                    eventId:
                        "event-movie-1002",

                    eventType:
                        "movie.published",

                    movieId:
                        "1002",

                    movieMongoId:
                        "movie-mongo-1002",

                    title:
                        "Duplicate Worker Movie",

                    slug:
                        "duplicate-worker-movie",

                    recipientUserId:
                        user._id.toString()
                }
            });


        const message =
            createRabbitMessage({
                jobId:
                    job.jobId,

                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1002",

                correlationId:
                    "event-movie-1002",

                metadata:
                    job.metadata
            });


        const firstResult =
            await processNotificationMessage(
                message
            );

        const secondResult =
            await processNotificationMessage(
                message
            );


        assert.equal(
            firstResult.claimed,
            true
        );

        assert.equal(
            secondResult.claimed,
            false
        );

        assert.equal(
            secondResult.acknowledged,
            true
        );


        assert.equal(
            await Notification.countDocuments({}),
            1
        );


        const updatedJob =
            await Job.findOne({
                jobId:
                    job.jobId
            });


        assert.equal(
            updatedJob.status,
            "completed"
        );
    }
);


test(
    "concurrent duplicate notification deliveries are processed exactly once",
    async () => {

        const user =
            await createTestUser(
                "concurrent-duplicate-worker@example.com"
            );

        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-concurrent-1003",

                correlationId:
                    "event-movie-concurrent-1003",

                metadata: {
                    eventId:
                        "event-movie-concurrent-1003",

                    eventType:
                        "movie.published",

                    movieId:
                        "concurrent-1003",

                    movieMongoId:
                        "movie-mongo-concurrent-1003",

                    title:
                        "Concurrent Duplicate Movie",

                    slug:
                        "concurrent-duplicate-movie",

                    recipientUserId:
                        user._id.toString()
                }
            });


        const message =
            createRabbitMessage({
                jobId:
                    job.jobId,

                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-concurrent-1003",

                correlationId:
                    "event-movie-concurrent-1003",

                metadata:
                    job.metadata
            });


        const results =
            await Promise.all([
                processNotificationMessage(
                    message
                ),

                processNotificationMessage(
                    message
                )
            ]);


        const claimedResults =
            results.filter(
                (result) =>
                    result.claimed === true
            );

        const skippedResults =
            results.filter(
                (result) =>
                    result.claimed === false
            );


        assert.equal(
            claimedResults.length,
            1
        );

        assert.equal(
            skippedResults.length,
            1
        );


        assert.equal(
            skippedResults[0].acknowledged,
            true
        );


        assert.equal(
            await Notification.countDocuments({}),
            1
        );


        const notification =
            await Notification.findOne({
                recipientUserId:
                    user._id
            });


        assert.ok(
            notification
        );

        assert.equal(
            notification.dedupeKey,
            `movie.published:concurrent-1003:${user._id}`
        );


        const updatedJob =
            await Job.findOne({
                jobId:
                    job.jobId
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
    }
);

test(
    "notification persistence remains idempotent for the same dedupeKey",
    async () => {

        const user =
            await createTestUser(
                "idempotent-worker@example.com"
            );


        const commonMetadata = {

            eventId:
                "event-movie-1003",

            eventType:
                "movie.published",

            movieId:
                "1003",

            movieMongoId:
                "movie-mongo-1003",

            title:
                "Idempotent Movie",

            slug:
                "idempotent-movie",

            recipientUserId:
                user._id.toString()
        };


        const firstJob =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1003",

                correlationId:
                    "event-movie-1003",

                metadata:
                    commonMetadata
            });


        const firstResult =
            await processNotificationMessage(
                createRabbitMessage({
                    jobId:
                        firstJob.jobId,

                    type:
                        "notification",

                    metadata:
                        commonMetadata
                })
            );


        /*
            A second Job represents a duplicate execution
            path reaching the persistence layer.

            It deliberately uses the same event, movie,
            and recipient combination.
        */
        const secondJob =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1003",

                correlationId:
                    "event-movie-1003",

                metadata:
                    commonMetadata
            });


        const secondResult =
            await processNotificationMessage(
                createRabbitMessage({
                    jobId:
                        secondJob.jobId,

                    type:
                        "notification",

                    metadata:
                        commonMetadata
                })
            );


        assert.equal(
            firstResult.dedupeKey,
            secondResult.dedupeKey
        );

        assert.equal(
            firstResult.notificationId,
            secondResult.notificationId
        );

        assert.equal(
            await Notification.countDocuments({}),
            1
        );
    }
);


test(
    "invalid JSON message is rejected",
    async () => {

        const message = {
            content:
                Buffer.from(
                    "{invalid-json"
                )
        };


        await assert.rejects(
            () =>
                processNotificationMessage(
                    message
                ),
            {
                code:
                    "INVALID_NOTIFICATION_MESSAGE"
            }
        );
    }
);


test(
    "message without jobId is rejected",
    async () => {

        await assert.rejects(
            () =>
                processNotificationMessage(
                    createRabbitMessage({
                        type:
                            "notification"
                    })
                ),
            {
                code:
                    "MISSING_NOTIFICATION_JOB_ID"
            }
        );
    }
);


test(
    "unsupported job type is rejected",
    async () => {

        await assert.rejects(
            () =>
                processNotificationMessage(
                    createRabbitMessage({
                        jobId:
                            "unsupported-notification-job",

                        type:
                            "unknown-notification-type"
                    })
                ),
            {
                code:
                    "UNSUPPORTED_NOTIFICATION_JOB"
            }
        );
    }
);


test(
    "notification job without recipient is rejected",
    async () => {

        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1004",

                metadata: {
                    eventId:
                        "event-movie-1004",

                    eventType:
                        "movie.published",

                    movieId:
                        "1004",

                    title:
                        "Missing Recipient Movie",

                    slug:
                        "missing-recipient-movie"
                }
            });


   const result =
    await processNotificationMessage(
        createRabbitMessage({
            jobId:
                job.jobId,

            type:
                "notification",

            metadata:
                job.metadata
        })
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

assert.equal(
    result.error.code,
    "MISSING_NOTIFICATION_RECIPIENT"
);
    }
);


test(
    "unsupported notification event type is rejected",
    async () => {

        const user =
            await createTestUser(
                "unsupported-event@example.com"
            );


        const job =
            await createJob({
                type:
                    "notification",

                entityType:
                    "movie",

                entityId:
                    "movie-mongo-1005",

                metadata: {
                    eventId:
                        "event-movie-1005",

                    eventType:
                        "movie.deleted",

                    movieId:
                        "1005",

                    title:
                        "Unsupported Event Movie",

                    slug:
                        "unsupported-event-movie",

                    recipientUserId:
                        user._id.toString()
                }
            });


   const result =
    await processNotificationMessage(
        createRabbitMessage({
            jobId:
                job.jobId,

            type:
                "notification",

            metadata:
                job.metadata
        })
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

assert.equal(
    result.error.code,
    "UNSUPPORTED_NOTIFICATION_EVENT_TYPE"
);
    }
);
