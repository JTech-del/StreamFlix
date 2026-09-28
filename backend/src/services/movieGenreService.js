"use strict";

import Movie from "../models/Movie.js";
import { STREAMFLIX_GENRES } from "../config/genres.js";

const STREAMFLIX_GENRE_SET = new Set(STREAMFLIX_GENRES);

export async function assignMovieGenres(movieId, genres) {
    const numericMovieId = Number(movieId);

    if (!Number.isInteger(numericMovieId) || numericMovieId < 1) {
        const error = new Error("Invalid movie ID.");
        error.code = "INVALID_MOVIE_ID";
        throw error;
    }

    if (!Array.isArray(genres)) {
        const error = new Error("Genres must be an array.");
        error.code = "INVALID_GENRES";
        throw error;
    }

    const normalizedGenres = [
        ...new Set(
            genres
                .filter((genre) => typeof genre === "string")
                .map((genre) => genre.trim())
                .filter(Boolean)
        )
    ];

    const invalidGenres = normalizedGenres.filter(
        (genre) => !STREAMFLIX_GENRE_SET.has(genre)
    );

    if (invalidGenres.length > 0) {
        const error = new Error(
            `Invalid StreamFlix genre(s): ${invalidGenres.join(", ")}`
        );
        error.code = "INVALID_GENRES";
        error.invalidGenres = invalidGenres;
        throw error;
    }

    const movie = await Movie.findOne({
        id: numericMovieId
    });

    if (!movie) {
        const error = new Error("Movie not found.");
        error.code = "MOVIE_NOT_FOUND";
        throw error;
    }

    movie.genres = normalizedGenres;

    await movie.save();

    return movie;
}
