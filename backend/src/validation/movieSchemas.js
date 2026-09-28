"use strict";

import { z } from "zod";

const releaseDateSchema = z
    .union([
        z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                "Release date must use YYYY-MM-DD format."
            )
            .refine(
                (value) => !Number.isNaN(Date.parse(value)),
                "Release date must be a valid date."
            ),

        z
            .string()
            .datetime({
                offset: true,
                message: "Release date must be a valid ISO date."
            })
    ])
    .nullable();

export const updateMovieMetadataSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Movie title is required.")
            .max(200, "Movie title must not exceed 200 characters."),

        description: z
            .string()
            .trim()
            .min(1, "Movie description is required.")
            .max(
                5000,
                "Movie description must not exceed 5000 characters."
            ),

        year: z
            .number()
            .int("Movie year must be an integer.")
            .min(1888, "Movie year is invalid.")
            .max(3000, "Movie year is invalid."),

        duration: z
            .string()
            .trim()
            .min(1, "Movie duration is required.")
            .max(100, "Movie duration must not exceed 100 characters."),

        rating: z
            .string()
            .trim()
            .min(1, "Movie rating is required.")
            .max(30, "Movie rating must not exceed 30 characters."),

        imdb: z
            .number()
            .min(0, "IMDb rating cannot be below 0.")
            .max(10, "IMDb rating cannot exceed 10.")
            .nullable(),

        quality: z
            .string()
            .trim()
            .min(1, "Movie quality is required.")
            .max(30, "Movie quality must not exceed 30 characters."),

        releaseDate: releaseDateSchema
    })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one movie metadata field is required."
        }
    );
