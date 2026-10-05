"use strict";

import { z } from "zod";

/*==================================================
    Notification Validation

    These schemas validate CLIENT-SUPPLIED values.

    Notification creation itself remains an internal
    server-side operation.
==================================================*/


/*------------------------------------------
    Notification List Query
------------------------------------------*/

export const notificationListQuerySchema = z
    .object({
        page: z.coerce
            .number()
            .int()
            .min(1)
            .default(1),

        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(50)
            .default(20),

        unreadOnly: z
            .enum(["true", "false"])
            .default("false")
    })
    .strict();


/*------------------------------------------
    Notification ID

    Keep IDs controlled and bounded.
------------------------------------------*/

export const notificationIdSchema = z
    .string()
    .trim()
    .min(1)
    .max(100);


/*------------------------------------------
    Internal Notification Creation Contract

    This is for trusted application services,
    not a public HTTP POST endpoint.
------------------------------------------*/

export const createNotificationSchema = z
    .object({
        recipientUserId: z
            .string()
            .trim()
            .min(1)
            .max(100),

        type: z.enum([
            "movie.published",
            "movie.upcoming",
            "account.security",
            "system"
        ]),

        title: z
            .string()
            .trim()
            .min(1)
            .max(200),

        message: z
            .string()
            .trim()
            .min(1)
            .max(2000),

        link: z
            .string()
            .trim()
            .max(2048)
            .nullable()
            .optional(),

        metadata: z
            .record(z.string(), z.unknown())
            .default({}),

        dedupeKey: z
            .string()
            .trim()
            .min(1)
            .max(500)
    })
    .strict();
