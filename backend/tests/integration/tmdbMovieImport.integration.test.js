"use strict";

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Resend } from "resend";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_test");
process.env.TMDB_API_KEY = "integration-test-tmdb-key";

const resendEmailsPrototype = Object.getPrototypeOf(
    new Resend("integration-test-key").emails
);

const resendSendMock = mock.method(
    resendEmailsPrototype,
    "send",
    async () => ({
        data: { id: "integration-test-email-id" },
        error: null
    })
);

const { app } = await import("../../src/server.js");

const { connectDatabase, disconnectDatabase } =
    await import("../../src/config/database.js");

const User = (await import("../../src/models/User.js")).default;
const Movie = (await import("../../src/models/Movie.js")).default;

const { hashPassword } =
    await import("../../src/services/authService.js");

await connectDatabase();

test.after(async () => {
    resendSendMock.mock.restore();
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
    await mongoServer.stop();
});

test(
    "POST /api/admin/movies/import-tmdb imports and persists a TMDB movie for an admin",
    async () => {
        const email = "tmdb-import-admin-integration@example.com";
        const password = "StrongPassword123!";

        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;

        const originalFetch = globalThis.fetch;

        globalThis.fetch = async (url) => {
            assert.match(
                url,
                /api\.themoviedb\.org\/3\/movie\/550/
            );

            return {
                ok: true,
                status: 200,
                async json() {
                    return {
                        id: 550,
                        title: "Fight Club",
                        overview:
                            "A mocked TMDB movie response for integration testing.",
                        release_date: "1999-10-15",
                        runtime: 139,
                        vote_average: 8.4,
                        imdb_id: "tt0137523",
                        genres: [
                            { id: 18, name: "Drama" },
                            { id: 53, name: "Thriller" }
                        ]
                    };
                }
            };
        };

        try {
            const response = await request(app)
                .post("/api/admin/movies/import-tmdb")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ tmdbId: 550 });

            assert.equal(response.status, 201);
            assert.equal(response.body.success, true);
            assert.equal(response.body.action, "created");

            const movie = await Movie.findOne({
                "external.tmdbId": 550
            });

            assert.ok(movie);

            assert.equal(movie.id, 1);
            assert.equal(movie.title, "Fight Club");
            assert.equal(movie.slug, "fight-club");
            assert.equal(
                movie.description,
                "A mocked TMDB movie response for integration testing."
            );
            assert.equal(movie.year, 1999);
            assert.equal(movie.duration, "139 min");

            assert.deepEqual(movie.genres, []);

            assert.equal(movie.external.tmdbId, 550);
            assert.equal(movie.external.tmdbRating, 8.4);
            assert.equal(movie.external.imdbId, "tt0137523");

            assert.deepEqual(
                movie.external.tmdbGenres,
                ["Drama", "Thriller"]
            );

            assert.equal(movie.rating, "Not Rated");
            assert.equal(movie.imdb, null);
            assert.equal(movie.quality, "HD");
            assert.equal(movie.status, "draft");
            assert.equal(movie.featured, false);
            assert.equal(movie.upcoming, false);

            assert.equal(movie.media.video, null);
            assert.equal(movie.media.trailer, null);
            assert.equal(movie.media.poster, null);
            assert.equal(movie.media.backdrop, null);
            assert.equal(movie.media.background, null);
            assert.equal(movie.media.logo, null);
        } finally {
            globalThis.fetch = originalFetch;
        }
    }
);

test(
    "POST /api/admin/movies/import-tmdb updates an existing movie without overwriting StreamFlix genres",
    async () => {
        const email = "tmdb-update-admin-integration@example.com";
        const password = "StrongPassword123!";

        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true
        });

        const existingMovie = await Movie.create({
            id: 42,
            slug: "existing-fight-club",
            title: "Old Fight Club Title",
            description: "Old description",
            year: 1999,
            duration: "120 min",
            rating: "PG-13",
            imdb: 7.5,
            quality: "HD",
            genres: ["Action", "Crime"],
            external: {
                tmdbId: 551,
                tmdbRating: 7.1,
                imdbId: "tt0137523",
                tmdbGenres: ["Old Genre"]
            },
            media: {
                video: null,
                trailer: null,
                poster: null,
                backdrop: null,
                background: null,
                logo: null
            },
            featured: true,
            upcoming: false,
            status: "published"
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;

        const originalFetch = globalThis.fetch;

        globalThis.fetch = async (url) => {
            assert.match(
                url,
                /api\.themoviedb\.org\/3\/movie\/551/
            );

            return {
                ok: true,
                status: 200,
                async json() {
                    return {
                        id: 551,
                        title: "Fight Club Updated",
                        overview: "Updated TMDB description.",
                        release_date: "1999-10-15",
                        runtime: 139,
                        vote_average: 8.8,
                        imdb_id: "tt0137523",
                        genres: [
                            { id: 18, name: "Drama" },
                            { id: 53, name: "Thriller" }
                        ]
                    };
                }
            };
        };

        try {
            const response = await request(app)
                .post("/api/admin/movies/import-tmdb")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ tmdbId: 551 });

            assert.equal(response.status, 200);
            assert.equal(response.body.success, true);
            assert.equal(response.body.action, "updated");

            const updatedMovie = await Movie.findById(existingMovie._id);

            assert.ok(updatedMovie);

            assert.equal(
                updatedMovie.title,
                "Fight Club Updated"
            );

            assert.equal(
                updatedMovie.description,
                "Updated TMDB description."
            );

            assert.equal(updatedMovie.year, 1999);
            assert.equal(updatedMovie.duration, "139 min");

            assert.deepEqual(
                updatedMovie.genres,
                ["Action", "Crime"]
            );

            assert.equal(
                updatedMovie.external.tmdbId,
                551
            );

            assert.equal(
                updatedMovie.external.tmdbRating,
                8.8
            );

            assert.equal(
                updatedMovie.external.imdbId,
                "tt0137523"
            );

            assert.deepEqual(
                updatedMovie.external.tmdbGenres,
                ["Drama", "Thriller"]
            );

            assert.equal(
                updatedMovie.rating,
                "PG-13"
            );

            assert.equal(
                updatedMovie.imdb,
                7.5
            );

            assert.equal(
                updatedMovie.featured,
                true
            );

            assert.equal(
                updatedMovie.upcoming,
                false
            );

            assert.equal(
                updatedMovie.status,
                "published"
            );
        } finally {
            globalThis.fetch = originalFetch;
        }
    }
);

test(
    "POST /api/admin/movies/import-tmdb handles a TMDB failure without persisting a movie",
    async () => {
        const email = "tmdb-failure-admin-integration@example.com";
        const password = "StrongPassword123!";

        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;

        const originalFetch = globalThis.fetch;

        globalThis.fetch = async (url) => {
            assert.match(
                url,
                /api\.themoviedb\.org\/3\/movie\/552/
            );

            return {
                ok: false,
                status: 404,
                async json() {
                    return {
                        status_message:
                            "The resource you requested could not be found."
                    };
                }
            };
        };

        try {
            const response = await request(app)
                .post("/api/admin/movies/import-tmdb")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ tmdbId: 552 });

            assert.equal(response.status, 500);
            assert.equal(response.body.success, false);
            assert.equal(
                response.body.message,
                "Failed to import movie from TMDB."
            );

            const movie = await Movie.findOne({
                "external.tmdbId": 552
            });

            assert.equal(movie, null);
        } finally {
            globalThis.fetch = originalFetch;
        }
    }
);
