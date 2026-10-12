
"use strict";

import express from "express";

import {
    streamVideo,
    streamTrailer,
    issuePlaybackAuthorization
} from "../controllers/videoController.js";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

import {
    requireMovieEntitlement
} from "../middleware/playbackEntitlementMiddleware.js";
import { requirePlaybackAuthentication } from "../middleware/playbackGrantMiddleware.js";

const router = express.Router();

// Public trailer preview remains available without purchase.
router.get(
    "/trailers/:movieId",
    streamTrailer
);

// Full movie playback requires a valid session and entitlement.
router.post(
    "/:movieId/authorization",
    requireAuthentication,
    requireMovieEntitlement,
    issuePlaybackAuthorization
);

router.get(
    "/:movieId",
    requirePlaybackAuthentication,
    requireMovieEntitlement,
    streamVideo
);

export default router;
