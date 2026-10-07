"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: {
        count: 1
    }
});

process.env.MONGODB_URI =
    mongoServer.getUri("streamflix_refresh_test");

const { app } =
    await import("../../src/server.js");

const {
    connectDatabase,
    disconnectDatabase
} = await import("../../src/config/database.js");

const User =
    (await import("../../src/models/User.js")).default;

const Session =
    (await import("../../src/models/Session.js")).default;

const {
    createRefreshToken,
    hashRefreshToken
} =
    await import("../../src/services/authService.js");

await connectDatabase();

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
    await mongoServer.stop();
});

test(
    "concurrent refresh requests rotate the same refresh token exactly once",
    async () => {
        const user = await User.create({
            email: "refresh-concurrency@example.com",
            passwordHash: "integration-test-password-hash",
            role: "user",
            status: "active",
            emailVerified: true
        });

        const sessionId =
            "refresh-concurrency-session";

        const refreshToken =
            createRefreshToken(
                user,
                sessionId
            );

        const refreshTokenHash =
            hashRefreshToken(
                refreshToken
            );

        const expiresAt =
            new Date(
                Date.now() +
                60 * 60 * 1000
            );

        const absoluteExpiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            );

        await Session.create({
            userId: user._id,
            refreshTokenHash,
            sessionId,
            revokedAt: null,
            expiresAt,
            absoluteExpiresAt,
            lastUsedAt: new Date()
        });

        const refreshCookie =
            `streamflix_refresh_token=${encodeURIComponent(
                refreshToken
            )}`;

        const sendRefresh =
            () =>
                request(app)
                    .post("/api/auth/refresh")
                    .set(
                        "cookie",
                        refreshCookie
                    );

        const [
            firstResponse,
            secondResponse
        ] = await Promise.all([
            sendRefresh(),
            sendRefresh()
        ]);

        const responses = [
            firstResponse,
            secondResponse
        ];

        const successfulResponses =
            responses.filter(
                response =>
                    response.status === 200
            );

        const rejectedResponses =
            responses.filter(
                response =>
                    response.status === 401
            );

        assert.equal(
            successfulResponses.length,
            1
        );

        assert.equal(
            rejectedResponses.length,
            1
        );

        const successfulResponse =
            successfulResponses[0];

        assert.equal(
            successfulResponse.body.success,
            true
        );

        assert.ok(
            successfulResponse.body.data
        );

        assert.ok(
            successfulResponse.body.data.accessToken
        );

        const setCookie =
            successfulResponse.headers[
                "set-cookie"
            ];

        assert.ok(
            setCookie
        );

        const rotatedCookie =
            setCookie.find(
                cookie =>
                    cookie.startsWith(
                        "streamflix_refresh_token="
                    )
            );

        assert.ok(
            rotatedCookie
        );

        const rotatedRefreshToken =
            decodeURIComponent(
                rotatedCookie
                    .split(";")[0]
                    .slice(
                        "streamflix_refresh_token="
                            .length
                    )
            );

        assert.ok(
            rotatedRefreshToken
        );

        assert.notEqual(
            rotatedRefreshToken,
            refreshToken
        );

        const storedSession =
            await Session.findOne({
                sessionId
            }).select(
                "+refreshTokenHash"
            );

        assert.ok(storedSession);

        assert.equal(
            storedSession.refreshTokenHash,
            hashRefreshToken(
                rotatedRefreshToken
            )
        );

        assert.notEqual(
            storedSession.refreshTokenHash,
            refreshTokenHash
        );

        const oldTokenResponse =
            await request(app)
                .post("/api/auth/refresh")
                .set(
                    "cookie",
                    refreshCookie
                );

        assert.equal(
            oldTokenResponse.status,
            401
        );

        assert.equal(
            oldTokenResponse.body.success,
            false
        );

        assert.equal(
            oldTokenResponse.body.message,
            "Invalid refresh token."
        );
    }
);
