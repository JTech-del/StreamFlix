
"use strict";

import express from "express";

import {
    getMovies,
    getMovieById
} from "../services/movieService.js";
import { hasMovieVideoFile } from "../services/videoService.js";


const router = express.Router();


/*==================================================
    Backend API Configuration
==================================================*/

const API_BASE_URL = (
    process.env.API_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`
).replace(/\/+$/, "");

const TMDB_IMAGE_BASE_URL =
    "https://image.tmdb.org/t/p";

const TMDB_IMAGE_SIZES = new Set([
    "w500",
    "w1280"
]);

const YOUTUBE_KEY_PATTERN =
    /^[A-Za-z0-9_-]{11}$/;


/*==================================================
    TMDB Image URL
==================================================*/

function buildTmdbImageUrl(imagePath, size) {
    if (
        typeof imagePath !== "string" ||
        !/^\/[A-Za-z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/i.test(
            imagePath
        ) ||
        !TMDB_IMAGE_SIZES.has(size)
    ) {
        return null;
    }

    return `${TMDB_IMAGE_BASE_URL}/${size}${imagePath}`;
}


/*==================================================
    YouTube Embed URL

    The returned URL is intended for an iframe,
    not an HTML video element.
==================================================*/

function buildYouTubeEmbedUrl(key) {
    if (
        typeof key !== "string" ||
        !YOUTUBE_KEY_PATTERN.test(key)
    ) {
        return null;
    }

    return (
        "https://www.youtube-nocookie.com/embed/" +
        `${key}?autoplay=1&rel=0&playsinline=1`
    );
}


/*==================================================
    Build Frontend Movie Response

    MongoDB remains the source of truth.

    Physical storage filenames are not returned.

    Full movie:
        /api/videos/:movieId

    Poster/backdrop:
        Local image endpoint or TMDB image URL

    Trailer:
        YouTube privacy-enhanced embed URL
==================================================*/

function buildMovieResponse(movie) {
    if (!movie) {
        return null;
    }

    const external = movie.external || {};

    const trailerUrl = buildYouTubeEmbedUrl(
        external.tmdbTrailerKey
    );
    const playbackAvailable = Boolean(
        movie.video && hasMovieVideoFile(movie.video)
    );

    return {
        ...movie,

        /*------------------------------------------
            Poster
        ------------------------------------------*/

        poster: movie.poster
            ? `${API_BASE_URL}/api/images/${movie.id}/poster`
            : buildTmdbImageUrl(
                external.tmdbPosterPath,
                "w500"
            ),

        /*------------------------------------------
            Backdrop
        ------------------------------------------*/

        backdrop: movie.backdrop
            ? `${API_BASE_URL}/api/images/${movie.id}/backdrop`
            : buildTmdbImageUrl(
                external.tmdbBackdropPath,
                "w1280"
            ),

        /*------------------------------------------
            Background
        ------------------------------------------*/

        background: movie.background
            ? `${API_BASE_URL}/api/images/${movie.id}/background`
            : buildTmdbImageUrl(
                external.tmdbBackdropPath,
                "w1280"
            ),

        /*------------------------------------------
            Logo
        ------------------------------------------*/

        logo: movie.logo
            ? `${API_BASE_URL}/api/images/${movie.id}/logo`
            : null,

        /*------------------------------------------
            Full Movie Stream

            This URL is protected by the backend
            authentication and entitlement checks.
        ------------------------------------------*/

        video: playbackAvailable
            ? `${API_BASE_URL}/api/videos/${movie.id}`
            : null,

        playbackAvailable,

        /*------------------------------------------
            Trailer

            Never expose the old physical filename
            through the public catalogue response.
        ------------------------------------------*/

        trailer: null,

        trailerUrl,

        trailerProvider: trailerUrl
            ? "youtube"
            : null
    };
}


/*==================================================
    Get All Published Movies
==================================================*/

router.get(
    "/movies",
    async (req, res) => {
        try {
            const movies = await getMovies();

            const response = movies.map(
                buildMovieResponse
            );

            return res.json({
                success: true,
                data: response
            });
        } catch (error) {
            console.error(
                "Failed to load movies:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load movies"
            });
        }
    }
);


/*==================================================
    Get Published Movie By ID
==================================================*/

router.get(
    "/movies/:movieId",
    async (req, res) => {
        try {
            const movie = await getMovieById(
                req.params.movieId
            );

            if (!movie) {
                return res.status(404).json({
                    success: false,
                    message: "Movie not found"
                });
            }

            return res.json({
                success: true,
                data: buildMovieResponse(movie)
            });
        } catch (error) {
            console.error(
                "Failed to load movie:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load movie"
            });
        }
    }
);


/*==================================================
    Export
==================================================*/

export default router;
