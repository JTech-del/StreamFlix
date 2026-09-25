"use strict";

/*==================================================
    StreamFlix

    Email Service

    Responsibility:

    ✓ Provide a centralized email-sending interface
    ✓ Keep authentication flows independent of
      the underlying email provider
    ✓ Delegate delivery to the email provider adapter

    Provider implementation will be added separately.
==================================================*/

import {
    sendEmailThroughProvider
} from "./emailProvider.js";

export async function sendEmail({
    to,
    subject,
    text,
    html
}) {
    if (
        typeof to !== "string" ||
        !to.trim()
    ) {
        throw new Error(
            "Email recipient is required."
        );
    }

    if (
        typeof subject !== "string" ||
        !subject.trim()
    ) {
        throw new Error(
            "Email subject is required."
        );
    }

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        throw new Error(
            "Email text content is required."
        );
    }

    if (
        html !== undefined &&
        (
            typeof html !== "string" ||
            !html.trim()
        )
    ) {
        throw new Error(
            "Email HTML content must be a non-empty string when provided."
        );
    }

    return sendEmailThroughProvider({
        to,
        subject,
        text,
        html
    });
}
