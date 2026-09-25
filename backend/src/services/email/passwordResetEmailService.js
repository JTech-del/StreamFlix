"use strict";

/*==================================================
    StreamFlix

    Password Reset Email Service

    Responsibility:

    ✓ Build password-reset messages
    ✓ Build the password-reset URL
    ✓ Provide text and HTML email content
    ✓ Delegate delivery to the email service

    Token generation and persistence remain inside
    verificationTokenService.js.
==================================================*/

import { sendEmail } from "./emailService.js";

const FRONTEND_URL =
    "https://streamflix-sand.vercel.app";

export async function sendPasswordResetEmail({
    email,
    token
}) {
    if (
        typeof email !== "string" ||
        !email.trim()
    ) {
        throw new Error(
            "Password reset email recipient is required."
        );
    }

    if (
        typeof token !== "string" ||
        !token.trim()
    ) {
        throw new Error(
            "Password reset token is required."
        );
    }

    const resetUrl =
        `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

    const subject =
        "Reset your StreamFlix password";

    const text =
        [
            "StreamFlix password reset request.",
            "",
            "You can reset your password by opening the link below:",
            "",
            resetUrl,
            "",
            "This password reset link expires after 1 hour.",
            "",
            "If you did not request a password reset, you can safely ignore this email."
        ].join("\n");

    const html =
        `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Reset your StreamFlix password</h2>

                <p>
                    A password reset was requested for your
                    StreamFlix account.
                </p>

                <p>
                    <a
                        href="${resetUrl}"
                        style="
                            display: inline-block;
                            padding: 10px 16px;
                            background: #e50914;
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 4px;
                        "
                    >
                        Reset Password
                    </a>
                </p>

                <p>
                    This password reset link expires after 1 hour.
                </p>

                <p>
                    If you did not request a password reset,
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
