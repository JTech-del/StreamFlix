"use strict";

import {
    publishMovie
} from "../services/moviePublishingService.js";

export async function publishMovieController(req, res) {
    try {
        const { movieId } = req.params;

        const movie = await publishMovie(movieId);

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                title: movie.title,
                status: movie.status
            }
        });
    } catch (error) {
        if (error.code === "INVALID_MOVIE_ID") {
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
            "Movie publishing failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to publish movie."
        });
    }
}
