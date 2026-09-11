"use strict";

import express from "express";

import {
    streamTrailer
} from "../controllers/trailerController.js";


const router = express.Router();


/*==================================================
    Trailer
==================================================*/

/*
    GET /api/trailers/:movieId

    Example:

    /api/trailers/1
        ↓
    trailerController
        ↓
    trailerService
        ↓
    backend/storage/trailers/trailer-001.mp4
*/

router.get(
    "/:movieId",
    streamTrailer
);


/*==================================================
    Export
==================================================*/

export default router;