"use strict";

/*==================================================
    StreamFlix

    Resend Email Provider Adapter

    Responsibility:

    ✓ Validate normalized email payloads
    ✓ Send transactional email through Resend
    ✓ Keep Resend-specific logic isolated
    ✓ Prevent provider details from leaking into
      authentication services

    Sender identity is supplied through configuration.
==================================================*/

import { Resend } from "resend";

import config from "../../config/config.js";

const resend = new Resend(
    config.email.resendApiKey
);

export async function sendEmailThroughProvider({
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

    if (
        typeof config.email.from !== "string" ||
        !config.email.from.trim()
    ) {
        throw new Error(
            "Email sender is not configured."
        );
    }

    const emailPayload = {
        from: config.email.from,
        to: [to.trim()],
        subject: subject.trim(),
        text: text.trim()
    };

    if (html !== undefined) {
        emailPayload.html = html.trim();
    }

    const {
        data,
        error
    } = await resend.emails.send(
        emailPayload
    );

    if (error) {
        throw new Error(
            `Email delivery failed: ${error.message}`
        );
    }

    return data;
}
