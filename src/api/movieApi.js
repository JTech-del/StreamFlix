"use strict";


/*==================================================
    StreamFlix

    Frontend Movie API

    Responsibility:

    ✓ Communicate with the StreamFlix backend
    ✓ Fetch movie data
    ✓ Build protected media endpoint URLs
    ✓ Convert backend media paths to absolute URLs

    Does NOT handle:

    ✗ Movie normalization
    ✗ DOM
    ✗ UI
    ✗ Video playback
    ✗ Trailer playback
    ✗ Mini Theatre state
==================================================*/


/*==================================================
    Backend Configuration
==================================================*/
const BACKEND_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";


const API_BASE_URL =
    `${BACKEND_BASE_URL}/api`;


/*==================================================
    Get Movies

    Backend:

    GET /api/movies
==================================================*/

export async function getMovies() {

    const response =
        await fetch(
            `${API_BASE_URL}/movies`
        );


    if (!response.ok) {

        throw new Error(
            `Failed to fetch movies: ${response.status}`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "Failed to load movies"
        );

    }


    return Array.isArray(
            result.data
        ) ?
        result.data : [];

}


/*==================================================
    Get Movie By ID

    Backend:

    GET /api/movies/:movieId
==================================================*/

export async function getMovieById(movieId) {

    if (
        movieId === null ||
        movieId === undefined ||
        movieId === ""
    ) {

        throw new Error(
            "Movie ID is required."
        );

    }


    const response =
        await fetch(
            `${API_BASE_URL}/movies/${encodeURIComponent(movieId)}`
        );


    if (!response.ok) {

        throw new Error(
            `Failed to fetch movie: ${response.status}`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "Movie not found"
        );

    }


    return result.data;

}


/*==================================================
    Movie Stream URL

    Backend:

    GET /api/videos/:movieId

    Example:

    Movie ID
       ↓
    /api/videos/1
       ↓
    backend/storage/videos/...
==================================================*/

export function getStreamUrl(movieId) {

    if (
        movieId === null ||
        movieId === undefined ||
        movieId === ""
    ) {

        return null;

    }


    return (
        `${API_BASE_URL}/videos/${encodeURIComponent(movieId)}`
    );

}


/*==================================================
    Poster URL

    Backend:

    GET /api/images/:movieId/poster
==================================================*/

export function getPosterUrl(movieId) {

    if (
        movieId === null ||
        movieId === undefined ||
        movieId === ""
    ) {

        return null;

    }


    return (
        `${API_BASE_URL}/images/${encodeURIComponent(movieId)}/poster`
    );

}


/*==================================================
    Backdrop URL

    Backend:

    GET /api/images/:movieId/backdrop
==================================================*/

export function getBackdropUrl(movieId) {

    if (
        movieId === null ||
        movieId === undefined ||
        movieId === ""
    ) {

        return null;

    }


    return (
        `${API_BASE_URL}/images/${encodeURIComponent(movieId)}/backdrop`
    );

}


/*==================================================
    Logo URL

    Backend:

    GET /api/images/:movieId/logo
==================================================*/

export function getLogoUrl(movieId) {

    if (
        movieId === null ||
        movieId === undefined ||
        movieId === ""
    ) {

        return null;

    }


    return (
        `${API_BASE_URL}/images/${encodeURIComponent(movieId)}/logo`
    );

}


/*==================================================
    Trailer URL

    IMPORTANT

    Backend registers:

        app.use(
            "/api/trailers",
            trailerRoutes
        );

    trailerRoutes registers:

        router.get(
            "/:movieId",
            streamTrailer
        );

    Therefore the final endpoint is:

        GET /api/trailers/:movieId

    NOT:

        /api/videos/trailers/:movieId
==================================================*/
export function getTrailerUrl(movieId) { if (movieId === null || movieId === undefined || movieId === "") { return null; } return (`${API_BASE_URL}/trailers/${encodeURIComponent(movieId)}`); }


/*==================================================
    Media URL

    Converts backend-relative media paths
    into complete URLs.

    Example:

        /assets/images/example.jpg

    becomes:

        http://localhost:5000/assets/images/example.jpg

    Absolute URLs are returned unchanged.
==================================================*/

export function getMediaUrl(mediaPath) {

    if (
        mediaPath === null ||
        mediaPath === undefined ||
        mediaPath === ""
    ) {

        return null;

    }


    const mediaUrl =
        String(mediaPath).trim();


    if (!mediaUrl) {

        return null;

    }


    /*----------------------------------------------
        Already an absolute HTTP URL
    ----------------------------------------------*/

    if (

        mediaUrl.startsWith(
            "http://"
        ) ||

        mediaUrl.startsWith(
            "https://"
        )

    ) {

        return mediaUrl;

    }


    /*----------------------------------------------
        Backend-relative URL

        /assets/...
        /api/...
    ----------------------------------------------*/

    if (
        mediaUrl.startsWith("/")
    ) {

        return (
            `${BACKEND_BASE_URL}${mediaUrl}`
        );

    }


    /*----------------------------------------------
        Relative path without leading slash

        Example:

        assets/images/example.jpg

        becomes:

        http://localhost:5000/assets/images/example.jpg
    ----------------------------------------------*/

    return (
        `${BACKEND_BASE_URL}/${mediaUrl}`
    );

}