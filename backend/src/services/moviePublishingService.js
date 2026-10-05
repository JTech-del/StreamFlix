"use strict";

import mongoose from "mongoose";

import Movie from "../models/Movie.js";
import { createOutboxEvent } from "./outboxService.js";

export async function publishMovie(movieId) {
    const numericMovieId = Number(movieId);

    if (
        !Number.isInteger(numericMovieId) ||
        numericMovieId < 1
    ) {
        const error = new Error(
            "Invalid movie ID."
        );

        error.code =
            "INVALID_MOVIE_ID";

        throw error;
    }

    const existingMovie =
        await Movie.findOne({
            id: numericMovieId
        });

    if (!existingMovie) {
        const error = new Error(
            "Movie not found."
        );

        error.code =
            "MOVIE_NOT_FOUND";

        throw error;
    }

    if (
        existingMovie.status ===
        "published"
    ) {
        return existingMovie;
    }

    const session =
        await mongoose.startSession();

    try {
        let publishedMovie;

        await session.withTransaction(
            async () => {
                const movie =
                    await Movie.findOne({
                        id: numericMovieId
                    }).session(session);

                if (!movie) {
                    const error =
                        new Error(
                            "Movie not found."
                        );

                    error.code =
                        "MOVIE_NOT_FOUND";

                    throw error;
                }

                if (
                    movie.status ===
                    "published"
                ) {
                    publishedMovie =
                        movie;

                    return;
                }

                movie.status =
                    "published";

                await movie.save({
                    session
                });

                await createOutboxEvent({
                    eventType:
                        "movie.published",

                    aggregateType:
                        "Movie",

                    aggregateId:
                        movie._id.toString(),

                    payload: {
                        movieId:
                            movie.id,

                        movieMongoId:
                            movie._id.toString(),

                        title:
                            movie.title,

                        slug:
                            movie.slug
                    },

                    session
                });

                publishedMovie =
                    movie;
            }
        );

        return publishedMovie;
    } finally {
        await session.endSession();
    }
}