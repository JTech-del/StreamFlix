"use strict";

import { z } from "zod";

const mediaReferenceSchema = z
    .string()
    .trim()
    .min(1, "Media reference cannot be empty.")
    .nullable();

export const updateMovieMediaSchema = z
    .object({
        video: mediaReferenceSchema,

        trailer: mediaReferenceSchema,

        poster: mediaReferenceSchema,

        backdrop: mediaReferenceSchema,

        background: mediaReferenceSchema,

        logo: mediaReferenceSchema
    })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one movie media field is required."
        }
    );
