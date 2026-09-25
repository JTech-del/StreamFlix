"use strict";

/*==================================================
    StreamFlix

    Verification Email Service

    Responsibility:

    ✓ Build email-verification messages
    ✓ Build the verification URL
    ✓ Provide text and HTML email content
    ✓ Delegate delivery to the email service

    Token generation and persistence remain inside
    verificationTokenService.js.
==================================================*/

import { sendEmail } from "./emailService.js";

const FRONTEND_URL =
    "https://streamflix-sand.vercel.app";

export async function sendVerificationEmail({
    email,
    token
}) {
    if (
        typeof email !== "string" ||
        !email.trim()
    ) {
        throw new Error(
            "Verification email recipient is required."
        );
    }

    if (
        typeof token !== "string" ||
        !token.trim()
    ) {
        throw new Error(
            "Verification token is required."
        );
    }

    const verificationUrl =
        `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

    const subject =
        "Verify your StreamFlix email address";

    const text =
        [
            "Welcome to StreamFlix.",
            "",
            "Please verify your email address by opening the link below:",
            "",
            verificationUrl,
            "",
            "This verification link expires after 24 hours.",
            "",
            "If you did not create a StreamFlix account, you can safely ignore this email."
        ].join("\n");

    const html =
        `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to StreamFlix</h2>

                <p>
                    Please verify your email address to activate
                    your StreamFlix account.
                </p>

                <p>
                    <a
                        href="${verificationUrl}"
                        style="
                            display: inline-block;
                            padding: 10px 16px;
                            background: #e50914;
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 4px;
                        "
                    >
                        Verify Email Address
                    </a>
                </p>

                <p>
                    This verification link expires after 24 hours.
                </p>

                <p>
                    If you did not create a StreamFlix account,
                    you can safely ignore this email.
                </p>
            </div>
        `;

    return sendEmail({
        to: email.trim(),
        subject,
        text,
        html
    });
}
