"use strict";

import Movie from "../models/Movie.js";

const EDITABLE_FIELDS = [
    "title",
    "description",
    "year",
    "duration",
    "rating",
    "imdb",
    "quality",
    "releaseDate"
];

function normalizeReleaseDate(value) {
    if (value === null) {
        return null;
    }

    return new Date(value);
}

export async function updateMovieMetadata(movieId, metadata) {
    const numericMovieId = Number(movieId);

    if (
        !Number.isInteger(numericMovieId) ||
        numericMovieId < 1
    ) {
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

    for (const field of EDITABLE_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(metadata, field)) {
            continue;
        }

        if (field === "releaseDate") {
            movie.releaseDate = normalizeReleaseDate(
                metadata.releaseDate
            );
            continue;
        }

        movie[field] = metadata[field];
    }

    await movie.save();

    return movie;
}
