"use strict";

import test from "node:test";

import assert from "node:assert/strict";

import jwt from "jsonwebtoken";

import config from "../../src/config/config.js";

import {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
} from "../../src/services/authService.js";


function createUser(overrides = {}) {

    return {
        _id: "jwt-test-user-123",
        role: "user",
        ...overrides
    };

}


test(
    "createAccessToken creates a token accepted by verifyAccessToken",
    () => {

        const user =
            createUser();

        const sessionId =
            "jwt-access-session-123";

        const token =
            createAccessToken(
                user,
                sessionId
            );

        const payload =
            verifyAccessToken(
                token
            );

        assert.equal(
            payload.sub,
            user._id
        );

        assert.equal(
            payload.role,
            user.role
        );

        assert.equal(
            payload.sid,
            sessionId
        );

        assert.equal(
            payload.type,
            "access"
        );

        assert.equal(
            payload.iss,
            config.jwt.issuer
        );

        assert.equal(
            payload.aud,
            config.jwt.audience
        );

    }
);


test(
    "createRefreshToken creates a token accepted by verifyRefreshToken",
    () => {

        const user =
            createUser();

        const sessionId =
            "jwt-refresh-session-123";

        const token =
            createRefreshToken(
                user,
                sessionId
            );

        const payload =
            verifyRefreshToken(
                token
            );

        assert.equal(
            payload.sub,
            user._id
        );

        assert.equal(
            payload.sid,
            sessionId
        );

        assert.equal(
            payload.type,
            "refresh"
        );

        assert.ok(
            payload.jti
        );

        assert.equal(
            payload.iss,
            config.jwt.issuer
        );

        assert.equal(
            payload.aud,
            config.jwt.audience
        );

    }
);


test(
    "verifyAccessToken rejects a token with the wrong issuer",
    () => {

        const token =
            jwt.sign(
                {
                    sub: "jwt-test-user-123",
                    role: "user",
                    sid: "jwt-session-issuer",
                    type: "access"
                },
                config.jwt.accessSecret,
                {
                    algorithm:
                        config.jwt.algorithm,
                    issuer:
                        "wrong-issuer",
                    audience:
                        config.jwt.audience,
                    expiresIn:
                        "15m"
                }
            );

        assert.throws(
            () =>
                verifyAccessToken(
                    token
                )
        );

    }
);


test(
    "verifyAccessToken rejects a token with the wrong audience",
    () => {

        const token =
            jwt.sign(
                {
                    sub: "jwt-test-user-123",
                    role: "user",
                    sid: "jwt-session-audience",
                    type: "access"
                },
                config.jwt.accessSecret,
                {
                    algorithm:
                        config.jwt.algorithm,
                    issuer:
                        config.jwt.issuer,
                    audience:
                        "wrong-audience",
                    expiresIn:
                        "15m"
                }
            );

        assert.throws(
            () =>
                verifyAccessToken(
                    token
                )
        );

    }
);


test(
    "verifyAccessToken rejects a token using an unsupported algorithm",
    () => {

        const token =
            jwt.sign(
                {
                    sub: "jwt-test-user-123",
                    role: "user",
                    sid: "jwt-session-algorithm",
                    type: "access"
                },
                config.jwt.accessSecret,
                {
                    algorithm:
                        "HS384",
                    issuer:
                        config.jwt.issuer,
                    audience:
                        config.jwt.audience,
                    expiresIn:
                        "15m"
                }
            );

        assert.throws(
            () =>
                verifyAccessToken(
                    token
                )
        );

    }
);


test(
    "verifyRefreshToken rejects an access token",
    () => {

        const accessToken =
            createAccessToken(
                createUser(),
                "jwt-cross-type-access"
            );

        assert.throws(
            () =>
                verifyRefreshToken(
                    accessToken
                )
        );

    }
);


test(
    "verifyAccessToken rejects a refresh token",
    () => {

        const refreshToken =
            createRefreshToken(
                createUser(),
                "jwt-cross-type-refresh"
            );

        assert.throws(
            () =>
                verifyAccessToken(
                    refreshToken
                )
        );

    }
);
