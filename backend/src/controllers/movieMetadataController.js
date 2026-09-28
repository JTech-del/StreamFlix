"use strict";

import {
    updateMovieMetadata
} from "../services/movieMetadataService.js";

import {
    updateMovieMetadataSchema
} from "../validation/movieSchemas.js";

export async function updateMovieMetadataController(req, res) {
    try {
        const validation = updateMovieMetadataSchema.safeParse(
            req.body
        );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid movie metadata.",
                errors: validation.error.issues.map(
                    (issue) => ({
                        field: issue.path.join("."),
                        message: issue.message
                    })
                )
            });
        }

        const { movieId } = req.params;

        const movie = await updateMovieMetadata(
            movieId,
            validation.data
        );

        return res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                slug: movie.slug,
                title: movie.title,
                description: movie.description,
                year: movie.year,
                duration: movie.duration,
                rating: movie.rating,
                imdb: movie.imdb ?? null,
                quality: movie.quality || "HD",
                releaseDate: movie.releaseDate || null
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
            "Movie metadata update failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update movie metadata."
        });
    }
}
