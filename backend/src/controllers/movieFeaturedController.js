"use strict";

import {
    updateMovieFeatured
} from "../services/movieFeaturedService.js";

export async function updateMovieFeaturedController(req, res) {
    try {
        const { movieId } = req.params;
        const { featured } = req.body;

        const movie = await updateMovieFeatured(
            movieId,
            featured
        );

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                title: movie.title,
                featured: movie.featured
            }
        });
    } catch (error) {
        if (error.code === "INVALID_MOVIE_ID") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "INVALID_FEATURED") {
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
            "Movie featured update failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update movie featured state."
        });
    }
}
