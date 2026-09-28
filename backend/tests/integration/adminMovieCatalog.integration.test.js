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

    process.env.MONGODB_URI = mongoServer.getUri("streamflix_admin_catalog_test");

    await mongoose.connect(process.env.MONGODB_URI);

    const adminPasswordHash = await hashPassword("AdminPassword123!");
    const userPasswordHash = await hashPassword("UserPassword123!");

    await User.create({
        email: "catalog-admin@streamflix.test",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        emailVerified: true
    });

    await User.create({
        email: "catalog-user@streamflix.test",
        passwordHash: userPasswordHash,
        role: "user",
        status: "active",
        emailVerified: true
    });

    await Movie.create([
        {
            id: 9101,
            slug: "catalog-draft-movie",
            title: "Catalog Draft Movie",
            description: "Draft catalog test movie.",
            year: 2026,
            duration: "110 min",
            rating: "PG",
            imdb: 7.1,
            quality: "HD",
            genres: ["Drama"],
            external: {
                tmdbId: 999101,
                tmdbRating: 7.0,
                imdbId: "tt999101"
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
            id: 9102,
            slug: "catalog-published-movie",
            title: "Catalog Published Movie",
            description: "Published catalog test movie.",
            year: 2026,
            duration: "115 min",
            rating: "PG-13",
            imdb: 8.0,
            quality: "HD",
            genres: ["Action", "Thriller"],
            external: {
                tmdbId: 999102,
                tmdbRating: 7.9,
                imdbId: "tt999102"
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
            id: 9103,
            slug: "catalog-archived-movie",
            title: "Catalog Archived Movie",
            description: "Archived catalog test movie.",
            year: 2025,
            duration: "105 min",
            rating: "R",
            imdb: 7.5,
            quality: "HD",
            genres: ["Crime"],
            external: {
                tmdbId: 999103,
                tmdbRating: 7.4,
                imdbId: "tt999103"
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
            email: "catalog-admin@streamflix.test",
            password: "AdminPassword123!"
        });

    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email: "catalog-user@streamflix.test",
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

test("admin can retrieve the complete catalog across all movie statuses", async () => {
    const response = await request(app)
        .get("/api/admin/movies")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 3);

    assert.deepEqual(
        response.body.data.map((movie) => movie.status),
        ["draft", "published", "archived"]
    );

    assert.equal(response.body.data[0].title, "Catalog Draft Movie");
    assert.equal(response.body.data[1].title, "Catalog Published Movie");
    assert.equal(response.body.data[2].title, "Catalog Archived Movie");
});

test("admin can filter catalog by draft status", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=draft")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].status, "draft");
    assert.equal(response.body.data[0].title, "Catalog Draft Movie");
});

test("admin can filter catalog by published status", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=published")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].status, "published");
    assert.equal(response.body.data[0].title, "Catalog Published Movie");
});

test("admin can filter catalog by archived status", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=archived")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].status, "archived");
    assert.equal(response.body.data[0].title, "Catalog Archived Movie");
});

test("invalid catalog status returns 400", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=unknown")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test("non-admin users cannot access the admin catalog", async () => {
    const response = await request(app)
        .get("/api/admin/movies")
        .set("Authorization", `Bearer ${userToken}`);

    assert.equal(response.status, 403);
});

test("unauthenticated users cannot access the admin catalog", async () => {
    const response = await request(app)
        .get("/api/admin/movies");

    assert.equal(response.status, 401);
});

test("public movie catalog remains limited to published movies", async () => {
    const response = await request(app)
        .get("/api/movies");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].status, "published");
    assert.equal(response.body.data[0].title, "Catalog Published Movie");
});

test("admin can filter catalog by featured state", async () => {
    const response = await request(app)
        .get("/api/admin/movies?featured=true")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, "Catalog Published Movie");
    assert.equal(response.body.data[0].featured, true);
});

test("admin can filter catalog by upcoming state", async () => {
    const response = await request(app)
        .get("/api/admin/movies?upcoming=true")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, "Catalog Draft Movie");
    assert.equal(response.body.data[0].upcoming, true);
});

test("admin can combine catalog filters", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=published&featured=true&upcoming=false")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, "Catalog Published Movie");
});

test("admin can search catalog by movie title", async () => {
    const response = await request(app)
        .get("/api/admin/movies?search=Published%20Movie")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, "Catalog Published Movie");
});

test("admin can search catalog by movie slug", async () => {
    const response = await request(app)
        .get("/api/admin/movies?search=catalog-archived")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].slug, "catalog-archived-movie");
});

test("invalid catalog boolean filters return 400", async () => {
    const featuredResponse = await request(app)
        .get("/api/admin/movies?featured=yes")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(featuredResponse.status, 400);
    assert.equal(featuredResponse.body.success, false);

    const upcomingResponse = await request(app)
        .get("/api/admin/movies?upcoming=no")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(upcomingResponse.status, 400);
    assert.equal(upcomingResponse.body.success, false);
});

test("empty catalog search returns 400", async () => {
    const response = await request(app)
        .get("/api/admin/movies?search=")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test("admin catalog pagination returns metadata", async () => {
    const response = await request(app)
        .get("/api/admin/movies?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 2);

    assert.deepEqual(
        response.body.data.map((movie) => movie.id),
        [9101, 9102]
    );

    assert.deepEqual(
        response.body.pagination,
        {
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2
        }
    );
});

test("admin catalog pagination returns the next page", async () => {
    const response = await request(app)
        .get("/api/admin/movies?page=2&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, 9103);

    assert.deepEqual(
        response.body.pagination,
        {
            page: 2,
            limit: 2,
            total: 3,
            totalPages: 2
        }
    );
});

test("admin catalog pagination can be combined with filters", async () => {
    const response = await request(app)
        .get("/api/admin/movies?status=published&page=1&limit=1")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, "Catalog Published Movie");

    assert.deepEqual(
        response.body.pagination,
        {
            page: 1,
            limit: 1,
            total: 1,
            totalPages: 1
        }
    );
});

test("invalid catalog pagination values return 400", async () => {
    const invalidPage = await request(app)
        .get("/api/admin/movies?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(invalidPage.status, 400);
    assert.equal(invalidPage.body.success, false);

    const invalidLimit = await request(app)
        .get("/api/admin/movies?limit=51")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(invalidLimit.status, 400);
    assert.equal(invalidLimit.body.success, false);

    const invalidPageFormat = await request(app)
        .get("/api/admin/movies?page=abc")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(invalidPageFormat.status, 400);
    assert.equal(invalidPageFormat.body.success, false);
});

test("admin catalog returns empty data for a page beyond the result set", async () => {
    const response = await request(app)
        .get("/api/admin/movies?page=3&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 0);

    assert.deepEqual(
        response.body.pagination,
        {
            page: 3,
            limit: 2,
            total: 3,
            totalPages: 2
        }
    );
});
