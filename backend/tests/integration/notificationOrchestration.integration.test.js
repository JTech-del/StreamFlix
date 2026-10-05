"use strict";

import {
    describe,
    test,
    before,
    afterEach,
    after
} from "node:test";

import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Job from "../../src/models/Job.js";
import User from "../../src/models/User.js";
import OutboxEvent from "../../src/models/OutboxEvent.js";

import {
    createMoviePublishedNotificationJobs
} from "../../src/services/notificationOrchestrationService.js";

let mongoServer;

async function createMoviePublishedEvent() {
    return OutboxEvent.create({
        eventId: crypto.randomUUID(),

        eventType:
            "movie.published",

        aggregateType:
            "Movie",

        aggregateId:
            new mongoose.Types.ObjectId().toString(),

        payload: {
            movieId: 123,

            movieMongoId:
                new mongoose.Types.ObjectId().toString(),

            title:
                "Test Movie",

            slug:
                "test-movie"
        },

        status:
            "pending"
    });
}

async function createUser(status = "active") {
    return User.create({
        email:
            `${crypto.randomUUID()}@example.com`,

        passwordHash:
            "test-password-hash",

        status
    });
}

describe(
    "Notification Orchestration Service",
    () => {

        before(async () => {

            mongoServer =
                await MongoMemoryServer.create();

            await mongoose.connect(
                mongoServer.getUri()
            );

            await Promise.all([
                Job.init(),
                User.init(),
                OutboxEvent.init()
            ]);
        });

        afterEach(async () => {

            await Promise.all([
                Job.deleteMany({}),
                User.deleteMany({}),
                OutboxEvent.deleteMany({})
            ]);
        });

        after(async () => {

            await mongoose.disconnect();

            if (mongoServer) {
                await mongoServer.stop();
            }
        });

        test(
            "creates one notification job for every active recipient",
            async () => {

                const activeUserOne =
                    await createUser("active");

                const activeUserTwo =
                    await createUser("active");

                await createUser("suspended");

                await createUser("disabled");

                const event =
                    await createMoviePublishedEvent();

                const result =
                    await createMoviePublishedNotificationJobs(
                        event
                    );

                assert.equal(
                    result.totalRecipients,
                    2
                );

                assert.equal(
                    result.createdCount,
                    2
                );

                assert.equal(
                    result.existingCount,
                    0
                );

                const jobs =
                    await Job.find({})
                        .sort({
                            "metadata.recipientUserId": 1
                        })
                        .lean();

                assert.equal(
                    jobs.length,
                    2
                );

                const recipientIds =
                    jobs.map(
                        (job) =>
                            job.metadata.recipientUserId
                    );

                assert.deepEqual(
                    new Set(recipientIds),
                    new Set([
                        activeUserOne._id.toString(),
                        activeUserTwo._id.toString()
                    ])
                );

                for (const job of jobs) {

                    const recipientUserId =
                        job.metadata.recipientUserId;

                    assert.equal(
                        job.jobId,
                        `notification:${event.eventId}:${recipientUserId}`
                    );

                    assert.equal(
                        job.type,
                        "notification"
                    );

                    assert.equal(
                        job.entityType,
                        "movie"
                    );

                    assert.equal(
                        job.entityId,
                        event.payload.movieMongoId
                    );

                    assert.equal(
                        job.status,
                        "queued"
                    );

                    assert.equal(
                        job.maxAttempts,
                        3
                    );

                    assert.equal(
                        job.correlationId,
                        event.eventId
                    );

                    assert.equal(
                        job.metadata.eventId,
                        event.eventId
                    );

                    assert.equal(
                        job.metadata.eventType,
                        "movie.published"
                    );

                    assert.equal(
                        job.metadata.movieId,
                        event.payload.movieId
                    );

                    assert.equal(
                        job.metadata.movieMongoId,
                        event.payload.movieMongoId
                    );

                    assert.equal(
                        job.metadata.title,
                        event.payload.title
                    );

                    assert.equal(
                        job.metadata.slug,
                        event.payload.slug
                    );
                }
            }
        );

        test(
            "reprocessing the same event does not create duplicate recipient jobs",
            async () => {

                const activeUserOne =
                    await createUser("active");

                const activeUserTwo =
                    await createUser("active");

                const event =
                    await createMoviePublishedEvent();

                const firstResult =
                    await createMoviePublishedNotificationJobs(
                        event
                    );

                const secondResult =
                    await createMoviePublishedNotificationJobs(
                        event
                    );

                assert.equal(
                    firstResult.createdCount,
                    2
                );

                assert.equal(
                    firstResult.existingCount,
                    0
                );

                assert.equal(
                    secondResult.createdCount,
                    0
                );

                assert.equal(
                    secondResult.existingCount,
                    2
                );

                assert.equal(
                    await Job.countDocuments({}),
                    2
                );

                const jobs =
                    await Job.find({}).lean();

                const jobIds =
                    jobs.map(
                        (job) => job.jobId
                    );

                assert.deepEqual(
                    new Set(jobIds),
                    new Set([
                        `notification:${event.eventId}:${activeUserOne._id}`,
                        `notification:${event.eventId}:${activeUserTwo._id}`
                    ])
                );
            }
        );

        test(
            "does not create notification jobs for suspended or disabled users",
            async () => {

                await createUser("suspended");

                await createUser("disabled");

                const event =
                    await createMoviePublishedEvent();

                const result =
                    await createMoviePublishedNotificationJobs(
                        event
                    );

                assert.equal(
                    result.totalRecipients,
                    0
                );

                assert.equal(
                    result.createdCount,
                    0
                );

                assert.equal(
                    result.existingCount,
                    0
                );

                assert.equal(
                    await Job.countDocuments({}),
                    0
                );
            }
        );

test(
    "concurrent orchestration of the same event does not create duplicate recipient jobs",
    async () => {

        const activeUserOne =
            await createUser("active");

        const activeUserTwo =
            await createUser("active");

        const event =
            await createMoviePublishedEvent();

        const results =
            await Promise.all([
                createMoviePublishedNotificationJobs(
                    event
                ),

                createMoviePublishedNotificationJobs(
                    event
                )
            ]);

        const totalCreated =
            results.reduce(
                (total, result) =>
                    total +
                    result.createdCount,
                0
            );

        const totalExisting =
            results.reduce(
                (total, result) =>
                    total +
                    result.existingCount,
                0
            );

        assert.equal(
            totalCreated,
            2
        );

        assert.equal(
            totalExisting,
            2
        );

        const jobs =
            await Job.find({})
                .sort({
                    "metadata.recipientUserId": 1
                })
                .lean();

        assert.equal(
            jobs.length,
            2
        );

        const jobIds =
            jobs.map(
                (job) => job.jobId
            );

        assert.equal(
            new Set(jobIds).size,
            2
        );

        assert.deepEqual(
            new Set(jobIds),
            new Set([
                `notification:${event.eventId}:${activeUserOne._id}`,
                `notification:${event.eventId}:${activeUserTwo._id}`
            ])
        );
    }
);



        test(
            "rejects an unsupported notification event type",
            async () => {

                const event =
                    await OutboxEvent.create({

                        eventId:
                            crypto.randomUUID(),

                        eventType:
                            "movie.deleted",

                        aggregateType:
                            "Movie",

                        aggregateId:
                            new mongoose.Types.ObjectId()
                                .toString(),

                        payload: {
                            movieId: 123
                        },

                        status:
                            "pending"
                    });

                await assert.rejects(
                    () =>
                        createMoviePublishedNotificationJobs(
                            event
                        ),
                    (error) => {

                        assert.equal(
                            error.code,
                            "UNSUPPORTED_NOTIFICATION_EVENT_TYPE"
                        );

                        return true;
                    }
                );

                assert.equal(
                    await Job.countDocuments({}),
                    0
                );
            }
        );

        test(
            "rejects when the outbox event is missing",
            async () => {

                await assert.rejects(
                    () =>
                        createMoviePublishedNotificationJobs(
                            null
                        ),
                    (error) => {

                        assert.equal(
                            error.code,
                            "INVALID_NOTIFICATION_OUTBOX_EVENT"
                        );

                        return true;
                    }
                );

                assert.equal(
                    await Job.countDocuments({}),
                    0
                );
            }
        );
    }
);
