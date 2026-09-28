"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_restore_test");

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
        slug: "restore-test-movie",
        title: "Restore Test Movie",
        description: "Movie used for restore integration testing.",
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
        status: "archived",
        media: {
            video: "/videos/restore-test.mp4",
            trailer: "/trailers/restore-test.mp4",
            poster: "/images/restore-test-poster.jpg",
            backdrop: "/images/restore-test-backdrop.jpg",
            background: "/images/restore-test-background.jpg",
            logo: "/images/restore-test-logo.png"
        },
        ...overrides
    });
}

test(
    "PATCH /api/admin/movies/:movieId/restore restores an archived movie to draft without changing catalog metadata",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "restore-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie();

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/restore`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.id, movie.id);
        assert.equal(response.body.data.title, movie.title);
        assert.equal(response.body.data.status, "draft");

        const updatedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(updatedMovie.status, "draft");
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
                video: "/videos/restore-test.mp4",
                trailer: "/trailers/restore-test.mp4",
                poster: "/images/restore-test-poster.jpg",
                backdrop: "/images/restore-test-backdrop.jpg",
                background: "/images/restore-test-background.jpg",
                logo: "/images/restore-test-logo.png"
            }
        );
    }
);

test(
    "PATCH /api/admin/movies/:movieId/restore rejects non-admin users",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "restore-user@example.com",
            role: "user"
        });

        const movie = await createMovie({
            id: 2,
            slug: "restore-user-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/restore`)
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

        assert.equal(unchangedMovie.status, "archived");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/restore rejects unauthenticated requests",
    async () => {
        const movie = await createMovie({
            id: 3,
            slug: "restore-unauthenticated-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/restore`);

        assert.equal(response.status, 401);
        assert.equal(response.body.success, false);

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "archived");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/restore returns 404 for a missing movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "restore-missing-admin@example.com",
            role: "admin"
        });

        const response = await request(app)
            .patch("/api/admin/movies/999/restore")
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 404);
        assert.equal(response.body.success, false);
        assert.equal(response.body.message, "Movie not found.");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/restore rejects a published movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "restore-published-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie({
            id: 4,
            slug: "restore-published-movie",
            status: "published"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/restore`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 409);
        assert.equal(response.body.success, false);
        assert.equal(
            response.body.message,
            "Only archived movies can be restored."
        );

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "published");
    }
);

test(
    "PATCH /api/admin/movies/:movieId/restore is idempotent for an already draft movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "restore-idempotent-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie({
            id: 5,
            slug: "already-draft-movie",
            status: "draft"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/restore`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.status, "draft");

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.equal(unchangedMovie.status, "draft");
        assert.deepEqual(
            unchangedMovie.genres,
            ["Action", "Thriller"]
        );
        assert.equal(unchangedMovie.external.tmdbId, 550);
    }
);
