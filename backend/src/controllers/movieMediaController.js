"use strict";

import {
    updateMovieMedia
} from "../services/movieMediaService.js";

import {
    updateMovieMediaSchema
} from "../validation/movieMediaSchemas.js";

export async function updateMovieMediaController(req, res) {
    try {
        const validation = updateMovieMediaSchema.safeParse(
            req.body
        );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid movie media.",
                errors: validation.error.issues.map(
                    (issue) => ({
                        field: issue.path.join("."),
                        message: issue.message
                    })
                )
            });
        }

        const { movieId } = req.params;

        const movie = await updateMovieMedia(
            movieId,
            validation.data
        );

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                slug: movie.slug,
                media: {
                    video: movie.media?.video ?? null,
                    trailer: movie.media?.trailer ?? null,
                    poster: movie.media?.poster ?? null,
                    backdrop: movie.media?.backdrop ?? null,
                    background: movie.media?.background ?? null,
                    logo: movie.media?.logo ?? null
                }
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
            "Movie media update failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update movie media."
        });
    }
}
