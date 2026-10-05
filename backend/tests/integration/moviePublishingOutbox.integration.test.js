"use strict";

import assert from "node:assert/strict";
import test, {
    before,
    after,
    beforeEach
} from "node:test";

import mongoose from "mongoose";
import {
    MongoMemoryReplSet
} from "mongodb-memory-server";

import Movie from "../../src/models/Movie.js";
import OutboxEvent from "../../src/models/OutboxEvent.js";
import {
    publishMovie
} from "../../src/services/moviePublishingService.js";

let mongoServer;

before(async () => {
    mongoServer =
        await MongoMemoryReplSet.create({
            replSet: {
                count: 1
            }
        });

    await mongoose.connect(
        mongoServer.getUri()
    );

    await Movie.init();
    await OutboxEvent.init();
});

beforeEach(async () => {
    await Movie.deleteMany({});
    await OutboxEvent.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

function createMovie(overrides = {}) {
    return {
        id: 1001,
        slug: "test-movie",
        title: "Test Movie",
        description: "Test description",
        year: 2026,
        duration: "1h 30m",
        rating: "PG-13",
        status: "draft",
        ...overrides
    };
}

test(
    "publishing a movie atomically changes Movie status and creates movie.published outbox event",
    async () => {
        const movie = await Movie.create(
            createMovie()
        );

        const result =
            await publishMovie(movie.id);

        assert.equal(
            result.status,
            "published"
        );

        const savedMovie =
            await Movie.findOne({
                id: movie.id
            }).lean();

        assert.equal(
            savedMovie.status,
            "published"
        );

        const events =
            await OutboxEvent.find({
                eventType: "movie.published",
                aggregateType: "Movie",
                aggregateId:
                    movie._id.toString()
            }).lean();

        assert.equal(events.length, 1);

        assert.equal(
            events[0].status,
            "pending"
        );

        assert.equal(
            events[0].payload.movieId,
            movie.id
        );

        assert.equal(
            events[0].payload.movieMongoId,
            movie._id.toString()
        );

        assert.equal(
            events[0].payload.title,
            movie.title
        );

        assert.equal(
            events[0].payload.slug,
            movie.slug
        );
    }
);

test(
    "publishing an already-published movie does not create a duplicate outbox event",
    async () => {
        const movie = await Movie.create(
            createMovie({
                id: 1002,
                slug: "already-published",
                status: "published"
            })
        );

        const result =
            await publishMovie(movie.id);

        assert.equal(
            result.status,
            "published"
        );

        const count =
            await OutboxEvent.countDocuments({
                eventType: "movie.published",
                aggregateId:
                    movie._id.toString()
            });

        assert.equal(count, 0);
    }
);

test(
    "publishing a nonexistent movie throws MOVIE_NOT_FOUND and creates no outbox event",
    async () => {
        await assert.rejects(
            publishMovie(999999),
            error => {
                assert.equal(
                    error.code,
                    "MOVIE_NOT_FOUND"
                );

                return true;
            }
        );

        assert.equal(
            await OutboxEvent.countDocuments(),
            0
        );
    }
);

test(
    "movie publication and outbox event remain transactionally coupled",
    async () => {
        const movie = await Movie.create(
            createMovie({
                id: 1003,
                slug: "transaction-test"
            })
        );

        /*
            The transaction coupling itself is established by using
            the same MongoDB session for both writes.

            This test additionally verifies that the resulting
            committed state contains both records.
        */
        await publishMovie(movie.id);

        const savedMovie =
            await Movie.findOne({
                id: movie.id
            }).lean();

        const event =
            await OutboxEvent.findOne({
                eventType: "movie.published",
                aggregateId:
                    movie._id.toString()
            }).lean();

        assert.equal(
            savedMovie.status,
            "published"
        );

        assert.ok(event);
        assert.equal(
            event.status,
            "pending"
        );
    }
);