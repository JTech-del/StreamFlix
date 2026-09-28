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
        "streamflix_admin_movie_media_test"
    );

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword(
        "AdminPassword123!"
    );

    const userPasswordHash = await hashPassword(
        "UserPassword123!"
    );

    await User.create({
        email: "movie-media-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    await User.create({
        email: "movie-media-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    await Movie.create({
        id: 9401,
        slug: "media-test-movie",
        title: "Media Test Movie",
        description: "Original media description.",
        year: 2026,
        duration: "110 min",
        rating: "PG",
        imdb: 7.1,
        quality: "HD",
        genres: ["Drama"],
        external: {
            tmdbId: 999401,
            tmdbRating: 7.0,
            imdbId: "tt999401"
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
            email: "movie-media-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "movie-media-user@streamflix.test",
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

test("admin can update a single movie media field", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            poster: "updated-poster.jpg"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
        response.body.data.media.poster,
        "updated-poster.jpg"
    );

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.media.poster, "updated-poster.jpg");
    assert.equal(movie.media.video, "original-video.mp4");
    assert.equal(movie.media.trailer, "original-trailer.mp4");
});

test("admin can update multiple movie media fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            video: "updated-video.mp4",
            trailer: "updated-trailer.mp4",
            backdrop: "updated-backdrop.jpg"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
        response.body.data.media.video,
        "updated-video.mp4"
    );
    assert.equal(
        response.body.data.media.trailer,
        "updated-trailer.mp4"
    );
    assert.equal(
        response.body.data.media.backdrop,
        "updated-backdrop.jpg"
    );

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.media.video, "updated-video.mp4");
    assert.equal(movie.media.trailer, "updated-trailer.mp4");
    assert.equal(movie.media.backdrop, "updated-backdrop.jpg");
});

test("partial media updates preserve untouched media fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            logo: "updated-logo.png"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.media.logo, "updated-logo.png");
    assert.equal(movie.media.video, "updated-video.mp4");
    assert.equal(movie.media.trailer, "updated-trailer.mp4");
    assert.equal(movie.media.poster, "updated-poster.jpg");
    assert.equal(movie.media.backdrop, "updated-backdrop.jpg");
    assert.equal(
        movie.media.background,
        "original-background.jpg"
    );
});

test("admin can update all movie media fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            video: "final-video.mp4",
            trailer: "final-trailer.mp4",
            poster: "final-poster.jpg",
            backdrop: "final-backdrop.jpg",
            background: "final-background.jpg",
            logo: "final-logo.png"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    assert.equal(
        response.body.data.media.video,
        "final-video.mp4"
    );
    assert.equal(
        response.body.data.media.trailer,
        "final-trailer.mp4"
    );
    assert.equal(
        response.body.data.media.poster,
        "final-poster.jpg"
    );
    assert.equal(
        response.body.data.media.backdrop,
        "final-backdrop.jpg"
    );
    assert.equal(
        response.body.data.media.background,
        "final-background.jpg"
    );
    assert.equal(
        response.body.data.media.logo,
        "final-logo.png"
    );

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.media.video, "final-video.mp4");
    assert.equal(movie.media.trailer, "final-trailer.mp4");
    assert.equal(movie.media.poster, "final-poster.jpg");
    assert.equal(movie.media.backdrop, "final-backdrop.jpg");
    assert.equal(movie.media.background, "final-background.jpg");
    assert.equal(movie.media.logo, "final-logo.png");
});

test("admin can clear a movie media field with null", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            trailer: null
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.media.trailer, null);

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.media.trailer, null);
    assert.equal(movie.media.video, "final-video.mp4");
});

test("media updates do not modify protected movie fields", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            poster: "protected-test-poster.jpg"
        });

    assert.equal(response.status, 200);

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.id, 9401);
    assert.equal(movie.slug, "media-test-movie");
    assert.equal(movie.title, "Media Test Movie");
    assert.equal(movie.year, 2026);
    assert.deepEqual(movie.genres, ["Drama"]);
    assert.equal(movie.featured, true);
    assert.equal(movie.upcoming, false);
    assert.equal(movie.status, "published");
    assert.equal(movie.external.tmdbId, 999401);
});

test("non-admin users cannot update movie media", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
            poster: "unauthorized-poster.jpg"
        });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
});

test("unauthenticated users cannot update movie media", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .send({
            poster: "unauthorized-poster.jpg"
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
});

test("invalid movie ID returns 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/abc/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            poster: "invalid-id-poster.jpg"
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Invalid movie ID.");
});

test("missing movie returns 404", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/999999/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            poster: "missing-movie-poster.jpg"
        });

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Movie not found.");
});

test("empty media body returns 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie media."
    );
});

test("invalid media values return 400", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            poster: "",
            video: 12345
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie media."
    );
});

test("protected fields cannot be updated through media endpoint", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/9401/media")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: "Changed Title",
            status: "archived",
            genres: ["Action"],
            featured: false,
            upcoming: true,
            slug: "changed-slug",
            id: 9999,
            external: {
                tmdbId: 123456
            }
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Invalid movie media."
    );

    const movie = await Movie.findOne({ id: 9401 }).lean();

    assert.equal(movie.id, 9401);
    assert.equal(movie.slug, "media-test-movie");
    assert.equal(movie.title, "Media Test Movie");
    assert.deepEqual(movie.genres, ["Drama"]);
    assert.equal(movie.featured, true);
    assert.equal(movie.upcoming, false);
    assert.equal(movie.status, "published");
    assert.equal(movie.external.tmdbId, 999401);
});
