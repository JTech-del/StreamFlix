"use strict";

import express from "express";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

import {
    listSessions,
    revokeSession,
    logoutOtherSessions
} from "../controllers/sessionController.js";

const router = express.Router();

router.get(
    "/",
    requireAuthentication,
    listSessions
);

router.post(
    "/logout-others",
    requireAuthentication,
    logoutOtherSessions
);

router.delete(
    "/:sessionId",
    requireAuthentication,
    revokeSession
);

export default router;
