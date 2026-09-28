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
let movieId;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri("streamflix_upcoming_test");

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword("AdminPassword123!");
    const userPasswordHash = await hashPassword("UserPassword123!");

    await User.create({
        email: "upcoming-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    await User.create({
        email: "upcoming-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    const movie = await Movie.create({
        id: 9002,
        slug: "upcoming-test-movie",
        title: "Upcoming Test Movie",
        description: "Upcoming integration test movie.",
        year: 2026,
        duration: "118 min",
        rating: "PG-13",
        imdb: 7.9,
        quality: "HD",
        genres: ["Adventure", "Drama"],
        external: {
            tmdbId: 999002,
            tmdbRating: 7.8,
            imdbId: "tt999002"
        },
        media: {
            video: null,
            trailer: null,
            poster: "upcoming-poster.jpg",
            backdrop: "upcoming-backdrop.jpg",
            background: null,
            logo: null
        },
        featured: false,
        upcoming: false,
        releaseDate: new Date("2026-12-01"),
        status: "published"
    });

    movieId = movie.id;

    const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "upcoming-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "upcoming-user@streamflix.test",
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

test("admin can mark a published movie as upcoming without changing catalog metadata", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/upcoming`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            upcoming: true
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, movieId);
    assert.equal(response.body.data.title, "Upcoming Test Movie");
    assert.equal(response.body.data.upcoming, true);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.upcoming, true);
    assert.equal(movie.title, "Upcoming Test Movie");
    assert.equal(movie.status, "published");
    assert.deepEqual(movie.genres, ["Adventure", "Drama"]);
    assert.equal(movie.external.tmdbId, 999002);
    assert.equal(movie.media.poster, "upcoming-poster.jpg");
});

test("admin can remove a movie from upcoming", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/upcoming`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            upcoming: false
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.upcoming, false);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.upcoming, false);
});

test("non-admin users cannot update upcoming state", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/upcoming`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
            upcoming: true
        });

    assert.equal(response.status, 403);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.upcoming, false);
});

test("unauthenticated requests cannot update upcoming state", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/upcoming`)
        .send({
            upcoming: true
        });

    assert.equal(response.status, 401);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.upcoming, false);
});

test("missing movie returns 404", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/999999/upcoming")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            upcoming: true
        });

    assert.equal(response.status, 404);
});

test("invalid upcoming value returns 400", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/upcoming`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            upcoming: "true"
        });

    assert.equal(response.status, 400);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.upcoming, false);
});
