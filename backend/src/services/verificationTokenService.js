"use strict";

/*==================================================
    StreamFlix

    Verification Token Service

    Responsibility:

    ✓ Generate cryptographically secure tokens
    ✓ Hash tokens before persistence
    ✓ Create verification/reset token records
    ✓ Retrieve tokens by secure hash
    ✓ Consume tokens exactly once
    ✓ Enforce token purpose
    ✓ Enforce token expiration

    Security:

    Raw tokens are returned only at creation time.

    MongoDB stores only SHA-256 token hashes.
==================================================*/

import crypto from "node:crypto";

import VerificationToken from "../models/VerificationToken.js";

const TOKEN_BYTE_LENGTH = 32;

const DEFAULT_EXPIRATION = {
    email_verification: 24 * 60 * 60 * 1000,
    password_reset: 60 * 60 * 1000
};

export function generateVerificationToken() {
    return crypto
        .randomBytes(TOKEN_BYTE_LENGTH)
        .toString("base64url");
}

export function hashVerificationToken(token) {
    if (
        typeof token !== "string" ||
        token.length === 0
    ) {
        throw new Error(
            "Verification token must be a non-empty string."
        );
    }

    return crypto
        .createHash("sha256")
        .update(token, "utf8")
        .digest("hex");
}

export function getTokenExpiration(
    purpose,
    now = Date.now()
) {
    const duration =
        DEFAULT_EXPIRATION[purpose];

    if (!duration) {
        throw new Error(
            "Unsupported verification token purpose."
        );
    }

    return new Date(
        now + duration
    );
}

export async function createVerificationToken(
    userId,
    purpose
) {
    if (!userId) {
        throw new Error(
            "User ID is required."
        );
    }

    if (!DEFAULT_EXPIRATION[purpose]) {
        throw new Error(
            "Unsupported verification token purpose."
        );
    }

    await VerificationToken.updateMany(
        {
            userId,
            purpose,
            usedAt: null,
            revokedAt: null,
            expiresAt: {
                $gt: new Date()
            }
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }
    );

    const rawToken =
        generateVerificationToken();

    const tokenHash =
        hashVerificationToken(rawToken);

    const expiresAt =
        getTokenExpiration(purpose);

    await VerificationToken.create({
        userId,
        tokenHash,
        purpose,
        expiresAt
    });

    return {
        token: rawToken,
        expiresAt
    };
}

export async function findValidVerificationToken(
    token,
    purpose
) {
    if (
        typeof token !== "string" ||
        token.length === 0
    ) {
        return null;
    }

    if (!DEFAULT_EXPIRATION[purpose]) {
        throw new Error(
            "Unsupported verification token purpose."
        );
    }

    const tokenHash =
        hashVerificationToken(token);

    const verificationToken =
        await VerificationToken
            .findOne({
                tokenHash,
                purpose,
                usedAt: null,
                revokedAt: null,
                expiresAt: {
                    $gt: new Date()
                }
            })
            .select("+tokenHash");

    return verificationToken;
}

export async function consumeVerificationToken(
    token,
    purpose,
    session = undefined
) {
    if (
        typeof token !== "string" ||
        token.length === 0
    ) {
        return null;
    }

    if (!DEFAULT_EXPIRATION[purpose]) {
        throw new Error(
            "Unsupported verification token purpose."
        );
    }

    const tokenHash =
        hashVerificationToken(token);

    const now =
        new Date();

    const verificationToken =
        await VerificationToken.findOneAndUpdate(
            {
                tokenHash,
                purpose,
                usedAt: null,
                revokedAt: null,
                expiresAt: {
                    $gt: now
                }
            },
            {
                $set: {
                    usedAt: now
                }
            },
            {
                returnDocument: "after",
                ...(session ? { session } : {})
            }
        ).select("+tokenHash");

    return verificationToken;
}







