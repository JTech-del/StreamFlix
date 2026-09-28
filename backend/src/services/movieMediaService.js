"use strict";

import Movie from "../models/Movie.js";

const EDITABLE_MEDIA_FIELDS = [
    "video",
    "trailer",
    "poster",
    "backdrop",
    "background",
    "logo"
];

export async function updateMovieMedia(movieId, media) {
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

    for (const field of EDITABLE_MEDIA_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(media, field)) {
            continue;
        }

        movie.media[field] = media[field];
    }

    await movie.save();

    return movie;
}
