"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_genre_test");

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
        slug: "genre-test-movie",
        title: "Genre Test Movie",
        description: "Movie used for genre integration testing.",
        year: 2025,
        duration: "120 min",
        rating: "Not Rated",
        imdb: null,
        quality: "HD",
        genres: [],
        external: {
            tmdbId: 550,
            tmdbRating: 8.4,
            imdbId: "tt0137523",
            tmdbGenres: ["Drama", "Thriller"]
        },
        featured: false,
        upcoming: false,
        releaseDate: null,
        status: "draft",
        media: {
            video: null,
            trailer: null,
            poster: null,
            backdrop: null,
            background: null,
            logo: null
        },
        ...overrides
    });
}

test(
    "PATCH /api/admin/movies/:movieId/genres assigns valid StreamFlix genres without changing TMDB genres",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "genre-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie();

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/genres`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                genres: ["Action", "Crime", "Thriller"]
            });

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);

        assert.deepEqual(
            response.body.data.genres,
            ["Action", "Crime", "Thriller"]
        );

        const updatedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.deepEqual(
            updatedMovie.genres,
            ["Action", "Crime", "Thriller"]
        );

        assert.deepEqual(
            updatedMovie.external.tmdbGenres,
            ["Drama", "Thriller"]
        );
    }
);

test(
    "PATCH /api/admin/movies/:movieId/genres rejects non-admin users",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "genre-user@example.com",
            role: "user"
        });

        const movie = await createMovie({
            id: 2,
            slug: "genre-user-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/genres`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                genres: ["Drama"]
            });

        assert.equal(response.status, 403);
        assert.equal(response.body.success, false);
        assert.equal(
            response.body.message,
            "Insufficient permissions."
        );

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.deepEqual(unchangedMovie.genres, []);
    }
);

test(
    "PATCH /api/admin/movies/:movieId/genres rejects unauthenticated requests",
    async () => {
        const movie = await createMovie({
            id: 3,
            slug: "genre-unauthenticated-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/genres`)
            .send({
                genres: ["Drama"]
            });

        assert.equal(response.status, 401);
        assert.equal(response.body.success, false);
    }
);

test(
    "PATCH /api/admin/movies/:movieId/genres rejects unsupported genres",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "genre-validation-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie({
            id: 4,
            slug: "genre-validation-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/genres`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                genres: ["Action", "Documentary"]
            });

        assert.equal(response.status, 400);
        assert.equal(response.body.success, false);
        assert.deepEqual(
            response.body.invalidGenres,
            ["Documentary"]
        );

        const unchangedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.deepEqual(unchangedMovie.genres, []);
    }
);

test(
    "PATCH /api/admin/movies/:movieId/genres removes duplicate genres",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "genre-duplicate-admin@example.com",
            role: "admin"
        });

        const movie = await createMovie({
            id: 5,
            slug: "genre-duplicate-movie"
        });

        const response = await request(app)
            .patch(`/api/admin/movies/${movie.id}/genres`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                genres: [
                    "Action",
                    "Action",
                    "Thriller",
                    "Thriller"
                ]
            });

        assert.equal(response.status, 200);

        assert.deepEqual(
            response.body.data.genres,
            ["Action", "Thriller"]
        );

        const updatedMovie = await Movie.findOne({
            id: movie.id
        });

        assert.deepEqual(
            updatedMovie.genres,
            ["Action", "Thriller"]
        );
    }
);

test(
    "PATCH /api/admin/movies/:movieId/genres returns 404 for a missing movie",
    async () => {
        const accessToken = await createUserAndLogin({
            email: "genre-missing-admin@example.com",
            role: "admin"
        });

        const response = await request(app)
            .patch("/api/admin/movies/999/genres")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                genres: ["Drama"]
            });

        assert.equal(response.status, 404);
        assert.equal(response.body.success, false);
        assert.equal(response.body.message, "Movie not found.");
    }
);
