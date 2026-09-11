"use strict";

/*==================================================
    StreamFlix

    Frontend Trailer Service

    Responsibility:

    ✓ Request trailer information from backend
    ✓ Build trailer stream URL
    ✓ Provide trailer URL to frontend controllers

    Does NOT handle:

    ✗ Physical files
    ✗ File paths
    ✗ Video streaming
    ✗ DOM
    ✗ UI
==================================================*/


/*==================================================
    Backend API
==================================================*/

const API_BASE_URL =
    "http://localhost:5000";


/*==================================================
    Get Trailer URL
==================================================*/

export function getTrailerUrl(movieId) {

    if (!movieId) {

        return null;

    }


    return `${API_BASE_URL}/api/trailers/${movieId}`;

}


/*==================================================
    Load Trailer
==================================================*/

export async function loadTrailer(movieId) {

    if (!movieId) {

        throw new Error(
            "Movie ID is required to load trailer."
        );

    }


    const trailerUrl =
        getTrailerUrl(movieId);


    try {

        const response =
            await fetch(trailerUrl);


        if (!response.ok) {

            throw new Error(
                `Trailer request failed: ${response.status}`
            );

        }


        /*
            We do not download the trailer here.

            The URL is returned so the <video>
            element can stream it directly.
        */

        return {

            movieId,

            url: trailerUrl

        };

    } catch (error) {

        console.error(
            "Failed to load trailer:",
            error
        );

        throw error;

    }

}