"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { app } from "../../src/server.js";
import User from "../../src/models/User.js";
import Movie from "../../src/models/Movie.js";
import Session from "../../src/models/Session.js";
import { hashPassword } from "../../src/services/authService.js";

let mongoServer;
let adminToken;
let userToken;
let movieId;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri("streamflix_featured_test");

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword("AdminPassword123!");
    const userPasswordHash = await hashPassword("UserPassword123!");

    const admin = await User.create({
        email: "featured-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    const user = await User.create({
        email: "featured-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    const movie = await Movie.create({
        id: 9001,
        slug: "featured-test-movie",
        title: "Featured Test Movie",
        description: "Featured integration test movie.",
        year: 2026,
        duration: "120 min",
        rating: "PG-13",
        imdb: 8.2,
        quality: "HD",
        genres: ["Action", "Drama"],
        external: {
            tmdbId: 999001,
            tmdbRating: 8.1,
            imdbId: "tt999001"
        },
        media: {
            video: null,
            trailer: null,
            poster: "featured-poster.jpg",
            backdrop: "featured-backdrop.jpg",
            background: null,
            logo: null
        },
        featured: false,
        upcoming: false,
        releaseDate: new Date("2026-09-01"),
        status: "published"
    });

    movieId = movie.id;

    const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "featured-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "featured-user@streamflix.test",
            password: "UserPassword123!"
        });

    assert.equal(userLogin.status, 200);
    userToken = userLogin.body.data.accessToken;

    assert.ok(admin._id);
    assert.ok(user._id);
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test("admin can mark a published movie as featured without changing catalog metadata", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/featured`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            featured: true
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, movieId);
    assert.equal(response.body.data.title, "Featured Test Movie");
    assert.equal(response.body.data.featured, true);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.featured, true);
    assert.equal(movie.title, "Featured Test Movie");
    assert.equal(movie.status, "published");
    assert.deepEqual(movie.genres, ["Action", "Drama"]);
    assert.equal(movie.external.tmdbId, 999001);
    assert.equal(movie.media.poster, "featured-poster.jpg");
});

test("admin can remove a movie from featured", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/featured`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            featured: false
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.featured, false);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.featured, false);
});

test("non-admin users cannot update featured state", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/featured`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
            featured: true
        });

    assert.equal(response.status, 403);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.featured, false);
});

test("unauthenticated requests cannot update featured state", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/featured`)
        .send({
            featured: true
        });

    assert.equal(response.status, 401);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.featured, false);
});

test("missing movie returns 404", async () => {
    const response = await request(app)
        .patch("/api/admin/movies/999999/featured")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            featured: true
        });

    assert.equal(response.status, 404);
});

test("invalid featured value returns 400", async () => {
    const response = await request(app)
        .patch(`/api/admin/movies/${movieId}/featured`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            featured: "true"
        });

    assert.equal(response.status, 400);

    const movie = await Movie.findOne({ id: movieId }).lean();

    assert.equal(movie.featured, false);
});
