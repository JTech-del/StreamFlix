"use strict";

/*==================================================
    StreamFlix

    Video Routes

    Movie:

        GET /api/videos/:movieId

    Trailer:

        GET /api/videos/trailers/:movieId

==================================================*/

import express from "express";

import {
    streamVideo,
    streamTrailer
} from "../controllers/videoController.js";


const router = express.Router();


/*==================================================
    Trailer Video

    IMPORTANT:

    This route comes before the generic
    /:movieId route.

    Example:

    GET /api/videos/trailers/7

==================================================*/

router.get(
    "/trailers/:movieId",
    streamTrailer
);


/*==================================================
    Movie Video

    Example:

    GET /api/videos/1

==================================================*/

router.get(
    "/:movieId",
    streamVideo
);


/*==================================================
    Export Router
==================================================*/

export default router;