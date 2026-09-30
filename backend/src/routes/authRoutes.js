"use strict";

import express from "express";

import {
    register,
    login,
    refreshToken,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword
} from "../controllers/authController.js";

import {
    registerRateLimiter,
    loginRateLimiter,
    refreshRateLimiter,
    verifyEmailRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter
} from "../middleware/authRateLimiters.js";

const router = express.Router();


/*==================================================
    Register
==================================================*/

router.post(
    "/register",
    registerRateLimiter,
    register
);


/*==================================================
    Verify Email
==================================================*/

router.get(
    "/verify-email",
    verifyEmailRateLimiter,
    verifyEmail
);

/*==================================================
    Forgot Password
==================================================*/

router.post(
    "/forgot-password",
    forgotPasswordRateLimiter,
    forgotPassword
);


/*==================================================
    Reset Password
==================================================*/

router.post(
    "/reset-password",
    resetPasswordRateLimiter,
    resetPassword
);


/*==================================================
    Login
==================================================*/

router.post(
    "/login",
    loginRateLimiter,
    login
);


/*==================================================
    Refresh Token
==================================================*/

router.post(
    "/refresh",
    refreshRateLimiter,
    refreshToken
);


/*==================================================
    Logout
==================================================*/

router.post(
    "/logout",
    logout
);


/*==================================================
    Export
==================================================*/

export default router;



