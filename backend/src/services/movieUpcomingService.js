"use strict";

import Movie from "../models/Movie.js";

export async function updateMovieUpcoming(movieId, upcoming) {
    const numericMovieId = Number(movieId);

    if (!Number.isInteger(numericMovieId) || numericMovieId < 1) {
        const error = new Error("Invalid movie ID.");
        error.code = "INVALID_MOVIE_ID";
        throw error;
    }

    if (typeof upcoming !== "boolean") {
        const error = new Error("Upcoming must be a boolean.");
        error.code = "INVALID_UPCOMING";
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

    movie.upcoming = upcoming;

    await movie.save();

    return movie;
}
