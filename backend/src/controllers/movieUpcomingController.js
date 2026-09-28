"use strict";

import {
    updateMovieUpcoming
} from "../services/movieUpcomingService.js";

export async function updateMovieUpcomingController(req, res) {
    try {
        const { movieId } = req.params;
        const { upcoming } = req.body;

        const movie = await updateMovieUpcoming(
            movieId,
            upcoming
        );

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                title: movie.title,
                upcoming: movie.upcoming
            }
        });
    } catch (error) {
        if (error.code === "INVALID_MOVIE_ID") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "INVALID_UPCOMING") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "MOVIE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error(
            "Movie upcoming update failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update movie upcoming state."
        });
    }
}
