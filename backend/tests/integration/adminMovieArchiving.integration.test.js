"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_archive_test");

const { app } = await import("../../src/server.js");

const { connectDatabase, disconnectDatabase } =
    await import("../../src/config/database.js");

const User = (await import("../../src/models/User.js")).default;
const Movie = (await import("../../src/models/Movie.js")).default;

const { hashPassword } =
    await import("../../src/services/authService.js");

await connectDatabase();

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
    await mongoServer.stop();
});

async function createUserAndLogin({
    email,
    role
}) {
    const password = "StrongPassword123!";
    const passwordHash = await hashPassword(password);

    await User.create({
        email,
        passwordHash,
        role,
        status: "active",
        emailVerified: true
    });

    const response = await request(app)
        .post("/api/auth/login")
        .send({
            email,
            password
        });

    assert.equal(response.status, 200);

    return response.body.data.accessToken;
}

async function createMovie(overrides = {}) {
    return Movie.create({
        id: 1,
        slug: "archive-test-movie",
        title: "Archive Test Movie",
        description: "Movie used for archive integration testing.",
        year: 2025,
        duration: "120 min",
        rating: "Not Rated",
        imdb: null,
        quality: "HD",
        genres: ["Action", "Thriller"],
        external: {
            tmdbId: 550,
            tmdbRating: 8.4,
            imdbId: "tt0137523",
            tmdbGenres: ["Drama", "Thriller"]
        },
        featured: false,
        upcoming: false,
        releaseDate: new Date("2025-01-15T00:00:00.000Z"),
        status: "published",
        media: {
            video: "/videos/archive-test.mp4",
            trailer: "/trailers/archive-test.mp4",
            poster: "/images/archive-test-poster.jpg",
            backdrop: "/images/archive-test-backdrop.jpg",
            background: "/images/archive-test-background.jpg",
            logo: "/images/archive-test-logo.png"
        },
        ...overrides
    });
}

test(
    "PATCH /api/admin/movies/:movieId/archive archives a published movie without changing catalog metadata",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "archive-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie();

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/archive`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.id, movie.id);
        assert.equal(response.body.data.title, movie.title);
        assert.equal(response.body.data.status, "archived");

        const updatedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(updatedMovie.status, "archived");
        assert.deepEqual(
            updatedMovie.genres,
            ["Action", "Thriller"]
        );
        assert.equal(updatedMovie.external.tmdbId, 550);
        assert.equal(updatedMovie.external.tmdbRating, 8.4);
        assert.equal(updatedMovie.external.imdbId, "tt0137523");
        assert.deepEqual(
            updatedMovie.external.tmdbGenres,
            ["Drama", "Thriller"]
        );
        assert.equal(updatedMovie.featured, false);
        assert.equal(updatedMovie.upcoming, false);
        assert.equal(
            updatedMovie.releaseDate.toISOString(),
            "2025-01-15T00:00:00.000Z"
        );
        assert.deepEqual(
            updatedMovie.media.toObject(),
            {
                video: "/videos/archive-test.mp4",
                trailer: "/trailers/archive-test.mp4",
                poster: "/images/archive-test-poster.jpg",
                backdrop: "/images/archive-test-backdrop.jpg",
                background: "/images/archive-test-background.jpg",
                logo: "/images/archive-test-logo.png"
            }
        );
    }
);

test(
    "PATCH /api/admin/movies/:movieId/archive rejects non-admin users",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "archive-user@example.com",
            role: "user"
        });

        const movie = await createMovie({
            id: 2,
            slug: "archive-user-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/archive`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 403);
        assert.equal(response.body.success, false);
        assert.equal(
            response.body.message,
            "Insufficient permissions."
        );

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "published");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/archive rejects unauthenticated requests",
    async () => {
        const movie = await createMovie({
            id: 3,
            slug: "archive-unauthenticated-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/archive`);

        assert.equal(response.status, 401);
        assert.equal(response.body.success, false);

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "published");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/archive returns 404 for a missing movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "archive-missing-admin@example.com",
            role: "admin"
        });

        const response = await request(app)
            .patch("/api/admin/movies/999/archive")
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 404);
        assert.equal(response.body.success, false);
        assert.equal(response.body.message, "Movie not found.");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/archive is idempotent for an already archived movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "archive-idempotent-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie({
            id: 5,
            slug: "already-archived-movie",
            status: "archived"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/archive`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.status, "archived");

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "archived");
        assert.deepEqual(
            unchangedMovie.genres,
            ["Action", "Thriller"]
        );
        assert.equal(unchangedMovie.external.tmdbId, 550);
    }
);
