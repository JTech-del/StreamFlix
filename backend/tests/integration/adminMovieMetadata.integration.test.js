"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { app } from "../../src/server.js";
import User from "../../src/models/User.js";
import Movie from "../../src/models/Movie.js";
import { hashPassword } from "../../src/services/authService.js";

let mongoServer;
let adminToken;
let userToken;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri(
        "streamflix_admin_movie_metadata_test"
    );

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword(
        "AdminPassword123!"
    );

    const userPasswordHash = await hashPassword(
        "UserPassword123!"
    );

    await User.create({
        email: "movie-metadata-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    await User.create({
        email: "movie-metadata-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    await Movie.create({
        id: 9301,
        slug: "metadata-test-movie",
        title: "Metadata Test Movie",
        description: "Original metadata description.",
        year: 2026,
        duration: "110 min",
        rating: "PG",
        imdb: 7.1,
        quality: "HD",
        genres: ["Drama"],
        external: {
            tmdbId: 999301,
            tmdbRating: 7.0,
            imdbId: "tt999301"
        },
        media: {
            video: "original-video.mp4",
            trailer: "original-trailer.mp4",
            poster: "original-poster.jpg",
            backdrop: "original-backdrop.jpg",
            background: "original-background.jpg",
            logo: "original-logo.png"
        },
        featured: true,
        upcoming: false,
        releaseDate: new Date("2026-11-01"),
        status: "published"
    });

    const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "movie-metadata-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "movie-metadata-user@streamflix.test",
            password: "UserPassword123!"
        });

    assert.equal(userLogin.status, 200);
    userToken = userLogin.body.data.accessToken;
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test("admin can update a single movie metadata field", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Updated Metadata Movie"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
        response.body.data.title,
        "Updated Metadata Movie"
    );

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.title, "Updated Metadata Movie");
    assert.equal(
        movie.description,
        "Original metadata description."
    );
    assert.equal(movie.year, 2026);
    assert.equal(movie.duration, "110 min");
});

test("admin can partially update multiple metadata fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            description: "Updated movie description.",
            year: 2027,
            duration: "125 min",
            rating: "PG-13"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
        response.body.data.description,
        "Updated movie description."
    );
    assert.equal(response.body.data.year, 2027);
    assert.equal(response.body.data.duration, "125 min");
    assert.equal(response.body.data.rating, "PG-13");

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.description, "Updated movie description.");
    assert.equal(movie.year, 2027);
    assert.equal(movie.duration, "125 min");
    assert.equal(movie.rating, "PG-13");
});

test("admin can update the full set of editable metadata", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Fully Updated Movie",
            description: "Fully updated description.",
            year: 2028,
            duration: "135 min",
            rating: "R",
            imdb: 8.6,
            quality: "4K",
            releaseDate: "2028-05-15"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    assert.equal(
        response.body.data.title,
        "Fully Updated Movie"
    );
    assert.equal(
        response.body.data.description,
        "Fully updated description."
    );
    assert.equal(response.body.data.year, 2028);
    assert.equal(response.body.data.duration, "135 min");
    assert.equal(response.body.data.rating, "R");
    assert.equal(response.body.data.imdb, 8.6);
    assert.equal(response.body.data.quality, "4K");
    assert.ok(response.body.data.releaseDate);

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.imdb, 8.6);
    assert.equal(movie.quality, "4K");
    assert.equal(
        movie.releaseDate.toISOString(),
        "2028-05-15T00:00:00.000Z"
    );
});

test("admin can clear a movie release date with null", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            releaseDate: null
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.releaseDate, null);

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.releaseDate, null);
});

test("metadata updates do not modify protected movie fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Protected Fields Test"
        });

    assert.equal(response.status, 200);

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.id, 9301);
    assert.equal(movie.slug, "metadata-test-movie");
    assert.deepEqual(movie.genres, ["Drama"]);
    assert.equal(movie.featured, true);
    assert.equal(movie.upcoming, false);
    assert.equal(movie.status, "published");
    assert.equal(movie.external.tmdbId, 999301);
    assert.equal(movie.media.video, "original-video.mp4");
});

test("non-admin users cannot update movie metadata", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
            title: "Unauthorized Update"
        });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
});

test("unauthenticated users cannot update movie metadata", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .send({
            title: "Unauthorized Update"
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
});

test("invalid movie ID returns 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/abc/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Invalid ID"
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Invalid movie ID.");
});

test("missing movie returns 404", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/999999/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Missing Movie"
        });

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Movie not found.");
});

test("empty metadata body returns 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie metadata."
    );
});

test("invalid metadata values return 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            year: 1800,
            imdb: 12,
            quality: ""
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie metadata."
    );
});

test("protected fields cannot be updated through metadata endpoint", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            status: "archived",
            genres: ["Action"],
            featured: false,
            upcoming: true,
            slug: "changed-slug",
            id: 9999,
            external: {
                tmdbId: 123456
            },
            media: {
                video: "new-video.mp4"
            }
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie metadata."
    );

    const movie = await Movie.findOne({ id: 9301 }).lean();

    assert.equal(movie.id, 9301);
    assert.equal(movie.slug, "metadata-test-movie");
    assert.deepEqual(movie.genres, ["Drama"]);
    assert.equal(movie.featured, true);
    assert.equal(movie.upcoming, false);
    assert.equal(movie.status, "published");
    assert.equal(movie.external.tmdbId, 999301);
});

test("invalid release date returns 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9301/metadata")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            releaseDate: "not-a-valid-date"
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie metadata."
    );
});
