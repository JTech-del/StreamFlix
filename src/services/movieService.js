"use strict";

/*==================================================
    StreamFlix

    Frontend Movie Service

    Responsibility:

    ✓ Load movies from backend
    ✓ Load single movie from backend
    ✓ Normalize backend movie data
    ✓ Create frontend media URLs
    ✓ Keep backend as source of truth

    Does NOT handle:

    ✗ DOM
    ✗ UI rendering
    ✗ Video playback
    ✗ Trailer playback
    ✗ Mini Theatre
==================================================*/

import {
    getMovies,
    getMovieById,
    getStreamUrl,
    getPosterUrl,
    getBackdropUrl,
    getLogoUrl,
    getTrailerUrl
} from "../api/movieApi.js";


/*==================================================
    Normalize Movie

    Converts backend movie data into the format
    expected by the frontend.

    The frontend receives the filename from the
    backend but does NOT construct physical
    storage paths.

    Backend remains responsible for resolving:

    storage/poster/
    storage/logos/
    storage/trailers/
    storage/videos/
==================================================*/

function normalizeMovie(movie) {

    if (!movie) {

        return null;

    }


    return {

        ...movie,


        /*------------------------------------------
            Backend Movie ID
        ------------------------------------------*/

        backendId: movie.id,


        /*------------------------------------------
            Poster URL
        ------------------------------------------*/

        posterUrl: movie.poster ?
            getPosterUrl(movie.id) : null,


        /*------------------------------------------
            Backdrop URL
        ------------------------------------------*/

        backdropUrl: movie.backdrop ?
            getBackdropUrl(movie.id) : null,


        /*------------------------------------------
            Logo URL
        ------------------------------------------*/

        logoUrl: movie.logo ?
            getLogoUrl(movie.id) : null,


        /*------------------------------------------
            Movie Stream URL
        ------------------------------------------*/

        streamUrl: movie.video ?
            getStreamUrl(movie.id) : null,


        /*------------------------------------------
            Trailer URL

            Backend:

            /api/trailers/:movieId
        ------------------------------------------*/

        trailerUrl: movie.trailer ?
            getTrailerUrl(movie.id) : null

    };

}


/*==================================================
    Load All Movies
==================================================*/

export async function loadMovies() {

    const movies =
        await getMovies();


    return movies

        .map(
        normalizeMovie
    )

    .filter(
        Boolean
    );

}


/*==================================================
    Load Single Movie
==================================================*/

export async function loadMovie(movieId) {

    const movie =
        await getMovieById(
            movieId
        );


    return normalizeMovie(
        movie
    );

}