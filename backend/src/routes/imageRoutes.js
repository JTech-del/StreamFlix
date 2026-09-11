"use strict";

import express from "express";

import {
    streamMovieImage
} from "../controllers/imageController.js";


const router = express.Router();


/*==================================================
    StreamFlix Image Routes

    Base URL:

        /api/images

    Examples:

        /api/images/7/poster
        /api/images/7/backdrop
        /api/images/7/background
        /api/images/7/logo

==================================================*/


/*==================================================
    Movie Image
==================================================*/

router.get(
    "/:movieId/:type",
    streamMovieImage
);


/*==================================================
    Export Router
==================================================*/

export default router;