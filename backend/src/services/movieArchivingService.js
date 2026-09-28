"use strict";

import Movie from "../models/Movie.js";

export async function archiveMovie(movieId) {
    const numericMovieId = Number(movieId);

    if (!Number.isInteger(numericMovieId) || numericMovieId < 1) {
        const error = new Error("Invalid movie ID.");
        error.code = "INVALID_MOVIE_ID";
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

    if (movie.status === "archived") {
        return movie;
    }

    movie.status = "archived";

    await movie.save();

    return movie;
}
