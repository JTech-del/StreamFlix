import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { app } from "../../src/server.js";


test("GET /api/health returns a successful health response", async () => {

    const response = await request(app)
        .get("/api/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        success: true,
        message: "StreamFlix API is running"
    });

});


test("Helmet security headers are present", async () => {

    const response = await request(app)
        .get("/api/health");

    assert.ok(
        response.headers["x-content-type-options"],
        "X-Content-Type-Options header should be present"
    );

    assert.ok(
        response.headers["x-frame-options"],
        "X-Frame-Options header should be present"
    );

    assert.ok(
        response.headers["referrer-policy"],
        "Referrer-Policy header should be present"
    );

});


test("configured CORS origin is accepted", async () => {

    const response = await request(app)
        .get("/api/health")
        .set("Origin", process.env.CLIENT_URL || "http://localhost:5173");

    assert.equal(response.status, 200);

    assert.equal(
        response.headers["access-control-allow-origin"],
        process.env.CLIENT_URL || "http://localhost:5173"
    );

});


test("unconfigured CORS origin does not receive CORS permission", async () => {

    const response = await request(app)
        .get("/api/health")
        .set("Origin", "https://evil.example");

    assert.equal(response.status, 200);

    assert.notEqual(
        response.headers["access-control-allow-origin"],
        "https://evil.example"
    );

});


test("JSON body limit rejects oversized requests", async () => {

    const oversizedPayload = {
        data: "x".repeat(1024 * 1024 + 1)
    };

    const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send(oversizedPayload);

    assert.equal(response.status, 413);

});


test("unknown routes return JSON 404 response", async () => {

    const response = await request(app)
        .get("/api/this-route-does-not-exist");

    assert.equal(response.status, 404);

    assert.deepEqual(response.body, {
        success: false,
        message: "Route not found"
    });

});


test("dotfiles are denied by the static asset handler", async () => {

    const response = await request(app)
        .get("/assets/.env");

    assert.ok(
        response.status === 403 ||
        response.status === 404,
        `Unexpected status: ${response.status}`
    );

});


test("malformed JSON receives a controlled error response", async () => {

    const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send('{"email":');

    assert.equal(response.status, 400);

    assert.equal(
        response.body.success,
        false
    );

});

test("public TMDB proxy routes are not exposed", async () => {

    const routes = [
        "/api/tmdb/search?query=Inception",
        "/api/tmdb/movies/27205",
        "/api/tmdb/movies/27205/videos"
    ];

    for (const route of routes) {

        const response = await request(app)
            .get(route);

        assert.equal(
            response.status,
            404,
            `${route} should not be publicly exposed`
        );

        assert.deepEqual(response.body, {
            success: false,
            message: "Route not found"
        });

    }

});
