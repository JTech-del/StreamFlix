"use strict";

import rateLimit from "express-rate-limit";


/*==================================================
    Authentication Rate Limiters
==================================================*/

/*
    These limits are intentionally scoped to authentication
    endpoints rather than applied globally.

    The limiter keys requests by client IP.

    standardHeaders uses the modern RateLimit response
    headers. legacyHeaders is disabled to avoid duplicate
    X-RateLimit-* headers.
*/


/*--------------------------------------------------
    Registration
--------------------------------------------------*/

export const registerRateLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many registration attempts. Please try again later."
        }
    });


/*--------------------------------------------------
    Login
--------------------------------------------------*/

export const loginRateLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many login attempts. Please try again later."
        }
    });


/*--------------------------------------------------
    Refresh Token
--------------------------------------------------*/

export const refreshRateLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many token refresh attempts. Please try again later."
        }
    });


/*--------------------------------------------------
    Email Verification
--------------------------------------------------*/

export const verifyEmailRateLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many verification attempts. Please try again later."
        }
    });


/*--------------------------------------------------
    Forgot Password
--------------------------------------------------*/

export const forgotPasswordRateLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many password reset requests. Please try again later."
        }
    });


/*--------------------------------------------------
    Reset Password
--------------------------------------------------*/

export const resetPasswordRateLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many password reset attempts. Please try again later."
        }
    });
