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
        "streamflix_admin_movie_retrieval_test"
    );

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword(
        "AdminPassword123!"
    );

    const userPasswordHash = await hashPassword(
        "UserPassword123!"
    );

    await User.create({
        email: "movie-retrieval-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    await User.create({
        email: "movie-retrieval-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    await Movie.create([
        {
            id: 9201,
            slug: "retrieval-draft-movie",
            title: "Retrieval Draft Movie",
            description: "Draft movie retrieval test.",
            year: 2026,
            duration: "110 min",
            rating: "PG",
            imdb: 7.1,
            quality: "HD",
            genres: ["Drama"],
            external: {
                tmdbId: 999201,
                tmdbRating: 7.0,
                imdbId: "tt999201"
            },
            media: {
                video: null,
                trailer: null,
                poster: "draft-poster.jpg",
                backdrop: null,
                background: null,
                logo: null
            },
            featured: false,
            upcoming: true,
            releaseDate: new Date("2026-11-01"),
            status: "draft"
        },
        {
            id: 9202,
            slug: "retrieval-published-movie",
            title: "Retrieval Published Movie",
            description: "Published movie retrieval test.",
            year: 2026,
            duration: "115 min",
            rating: "PG-13",
            imdb: 8.0,
            quality: "HD",
            genres: ["Action", "Thriller"],
            external: {
                tmdbId: 999202,
                tmdbRating: 7.9,
                imdbId: "tt999202"
            },
            media: {
                video: null,
                trailer: null,
                poster: "published-poster.jpg",
                backdrop: null,
                background: null,
                logo: null
            },
            featured: true,
            upcoming: false,
            releaseDate: new Date("2026-08-01"),
            status: "published"
        },
        {
            id: 9203,
            slug: "retrieval-archived-movie",
            title: "Retrieval Archived Movie",
            description: "Archived movie retrieval test.",
            year: 2025,
            duration: "105 min",
            rating: "R",
            imdb: 7.5,
            quality: "HD",
            genres: ["Crime"],
            external: {
                tmdbId: 999203,
                tmdbRating: 7.4,
                imdbId: "tt999203"
            },
            media: {
                video: null,
                trailer: null,
                poster: "archived-poster.jpg",
                backdrop: null,
                background: null,
                logo: null
            },
            featured: false,
            upcoming: false,
            releaseDate: new Date("2025-06-01"),
            status: "archived"
        }
    ]);

    const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "movie-retrieval-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "movie-retrieval-user@streamflix.test",
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

test("admin can retrieve a draft movie by ID", async () => {
    const response = await request(app)
        .get("/api/admin/movies/9201")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, 9201);
    assert.equal(response.body.data.title, "Retrieval Draft Movie");
    assert.equal(response.body.data.status, "draft");
    assert.deepEqual(
        response.body.data.genres,
        ["Drama"]
    );
});

test("admin can retrieve a published movie by ID", async () => {
    const response = await request(app)
        .get("/api/admin/movies/9202")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, 9202);
    assert.equal(response.body.data.title, "Retrieval Published Movie");
    assert.equal(response.body.data.status, "published");
});

test("admin can retrieve an archived movie by ID", async () => {
    const response = await request(app)
        .get("/api/admin/movies/9203")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, 9203);
    assert.equal(response.body.data.title, "Retrieval Archived Movie");
    assert.equal(response.body.data.status, "archived");
});

test("non-admin users cannot retrieve an admin movie by ID", async () => {
    const response = await request(app)
        .get("/api/admin/movies/9201")
        .set("Authorization", `Bearer ${userToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
});

test("unauthenticated users cannot retrieve an admin movie by ID", async () => {
    const response = await request(app)
        .get("/api/admin/movies/9201");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
});

test("invalid admin movie ID returns 400", async () => {
    const response = await request(app)
        .get("/api/admin/movies/abc")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Invalid movie ID.");
});

test("missing admin movie returns 404", async () => {
    const response = await request(app)
        .get("/api/admin/movies/999999")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Movie not found.");
});
