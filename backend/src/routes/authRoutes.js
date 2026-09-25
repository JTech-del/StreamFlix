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

const router = express.Router();


/*==================================================
    Register
==================================================*/

router.post(
    "/register",
    register
);


/*==================================================
    Verify Email
==================================================*/

router.get(
    "/verify-email",
    verifyEmail
);

/*==================================================
    Forgot Password
==================================================*/

router.post(
    "/forgot-password",
    forgotPassword
);


/*==================================================
    Reset Password
==================================================*/

router.post(
    "/reset-password",
    resetPassword
);


/*==================================================
    Login
==================================================*/

router.post(
    "/login",
    login
);


/*==================================================
    Refresh Token
==================================================*/

router.post(
    "/refresh",
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



