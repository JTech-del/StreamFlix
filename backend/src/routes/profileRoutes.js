"use strict";

import express from "express";

import {
    getProfile,
    patchProfile
} from "../controllers/profileController.js";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*==================================================
    Profile Routes
==================================================*/

/*
    Every profile operation belongs to the
    authenticated user.

    Ownership is determined by:

        req.user.id

    Never by client-supplied userId.
*/

router.get(
    "/",
    requireAuthentication,
    getProfile
);

router.patch(
    "/",
    requireAuthentication,
    patchProfile
);

export default router;
