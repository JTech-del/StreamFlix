"use strict";

import {
    assignMovieGenres
} from "../services/movieGenreService.js";

export async function updateMovieGenres(req, res) {
    try {
        const { movieId } = req.params;
        const { genres } = req.body;

        const movie = await assignMovieGenres(
            movieId,
            genres
        );

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                title: movie.title,
                genres: movie.genres
            }
        });
    } catch (error) {
        if (error.code === "INVALID_MOVIE_ID") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "INVALID_GENRES") {
            return res.status(400).json({
                success: false,
                message: error.message,
                invalidGenres: error.invalidGenres || []
            });
        }

        if (error.code === "MOVIE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error(
            "Movie genre update failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update movie genres."
        });
    }
}
