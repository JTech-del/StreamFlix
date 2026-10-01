"use strict";

import { z } from "zod";

const optionalText = (maxLength) =>
    z
        .string()
        .trim()
        .max(maxLength)
        .nullable()
        .optional();

export const updateProfileSchema = z
    .object({
        displayName: optionalText(100),
        firstName: optionalText(100),
        lastName: optionalText(100),
        bio: optionalText(500),
        avatarUrl: optionalText(2048)
    })
    .strict();
