"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import {
    registerRateLimiter,
    loginRateLimiter,
    refreshRateLimiter,
    verifyEmailRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter
} from "../../src/middleware/authRateLimiters.js";


function createTestApp(limiter) {

    const app = express();

    app.use(express.json());

    app.post(
        "/test",
        limiter,
        (req, res) => {

            res.status(200).json({
                success: true
            });

        }
    );

    return app;
}


async function assertRateLimit(
    limiter,
    allowedRequests,
    expectedMessage
) {

    const app =
        createTestApp(limiter);


    for (
        let attempt = 0;
        attempt < allowedRequests;
        attempt++
    ) {

        const response =
            await request(app)
                .post("/test")
                .send({});

assert.equal(
    response.status,
    200,
    `Request ${attempt + 1} should be allowed`
);


    }


    const limitedResponse =
        await request(app)
            .post("/test")
            .send({});


    assert.equal(
        limitedResponse.status,
        429
    );


    assert.deepEqual(
        limitedResponse.body,
        {
            success: false,
            message: expectedMessage
        }
    );


    assert.ok(
        limitedResponse.headers["ratelimit"],
        "RateLimit header should be present"
    );

}


/*==================================================
    Registration
==================================================*/

test(
    "registration limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            registerRateLimiter,
            5,
            "Too many registration attempts. Please try again later."
        );

    }
);


/*==================================================
    Login
==================================================*/

test(
    "login limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            loginRateLimiter,
            10,
            "Too many login attempts. Please try again later."
        );

    }
);


/*==================================================
    Refresh
==================================================*/

test(
    "refresh limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            refreshRateLimiter,
            30,
            "Too many token refresh attempts. Please try again later."
        );

    }
);


/*==================================================
    Email Verification
==================================================*/

test(
    "verification limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            verifyEmailRateLimiter,
            10,
            "Too many verification attempts. Please try again later."
        );

    }
);


/*==================================================
    Forgot Password
==================================================*/

test(
    "forgot-password limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            forgotPasswordRateLimiter,
            5,
            "Too many password reset requests. Please try again later."
        );

    }
);


/*==================================================
    Reset Password
==================================================*/

test(
    "reset-password limiter blocks requests after the configured limit",
    async () => {

        await assertRateLimit(
            resetPasswordRateLimiter,
            10,
            "Too many password reset attempts. Please try again later."
        );

    }
);
