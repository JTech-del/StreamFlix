"use strict";

import express from "express";

import {
    importMovieFromTmdb
} from "../services/tmdbMovieImportService.js";

import {
    updateMovieGenres
} from "../controllers/adminMovieController.js";

import {
    getAdminMoviesController,
    getAdminMovieByIdController
} from "../controllers/adminMovieCatalogController.js";

import {
    publishMovieController
} from "../controllers/moviePublishingController.js";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

import {
    requireRole
} from "../middleware/roleMiddleware.js";

import {
    archiveMovieController
} from "../controllers/movieArchivingController.js";

import {
    restoreMovieController
} from "../controllers/movieRestoringController.js";

import {
    updateMovieFeaturedController
} from "../controllers/movieFeaturedController.js";

import {
    updateMovieUpcomingController
} from "../controllers/movieUpcomingController.js";

import {
    updateMovieMetadataController
} from "../controllers/movieMetadataController.js";

import {
    updateMovieMediaController
} from "../controllers/movieMediaController.js";

const router = express.Router();

router.get(
    "/movies",
    requireAuthentication,
    requireRole("admin"),
    getAdminMoviesController
);

router.get(
    "/movies/:movieId",
    requireAuthentication,
    requireRole("admin"),
    getAdminMovieByIdController
);

router.post(
    "/movies/import-tmdb",
    requireAuthentication,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { tmdbId } = req.body;

            if (!tmdbId) {
                return res.status(400).json({
                    success: false,
                    message: "TMDB movie ID is required."
                });
            }

            const result = await importMovieFromTmdb(tmdbId);

            return res.status(
                result.action === "created" ? 201 : 200
            ).json({
                success: true,
                action: result.action,
                data: result.movie
            });
        } catch (error) {
            console.error(
                "TMDB movie import failed:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message: "Failed to import movie from TMDB."
            });
        }
    }
);

router.patch(
    "/movies/:movieId/genres",
    requireAuthentication,
    requireRole("admin"),
    updateMovieGenres
);

router.patch(
    "/movies/:movieId/metadata",
    requireAuthentication,
    requireRole("admin"),
    updateMovieMetadataController
);

router.patch(
    "/movies/:movieId/media",
    requireAuthentication,
    requireRole("admin"),
    updateMovieMediaController
);

router.patch(
    "/movies/:movieId/publish",
    requireAuthentication,
    requireRole("admin"),
    publishMovieController
);

router.patch(
    "/movies/:movieId/archive",
    requireAuthentication,
    requireRole("admin"),
    archiveMovieController
);

router.patch(
    "/movies/:movieId/restore",
    requireAuthentication,
    requireRole("admin"),
    restoreMovieController
);

router.patch(
    "/movies/:movieId/featured",
    requireAuthentication,
    requireRole("admin"),
    updateMovieFeaturedController
);

router.patch(
    "/movies/:movieId/upcoming",
    requireAuthentication,
    requireRole("admin"),
    updateMovieUpcomingController
);

export default router;

