"use strict";

import express from "express";

import {
    importMovieFromTmdb
} from "../services/tmdbMovieImportService.js";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

import {
    requireRole
} from "../middleware/roleMiddleware.js";


const router = express.Router();


router.post(
    "/movies/import-tmdb",

    requireAuthentication,

    requireRole("admin"),

    async (req, res) => {

        try {

            const {
                tmdbId
            } = req.body;


            if (!tmdbId) {

                return res.status(400).json({
                    success: false,
                    message: "TMDB movie ID is required."
                });

            }


            const result =
                await importMovieFromTmdb(
                    tmdbId
                );


            return res.status(
                result.action === "created"
                    ? 201
                    : 200
            ).json({

                success: true,

                action:
                    result.action,

                data:
                    result.movie

            });

        } catch (error) {

            console.error(
                "TMDB movie import failed:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to import movie from TMDB."

            });

        }

    }
);


export default router;