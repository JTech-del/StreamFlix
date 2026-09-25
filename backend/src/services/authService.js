"use strict";

/*==================================================
    StreamFlix

    Authentication Service

    Responsibility:

    ✓ Hash passwords with Argon2
    ✓ Verify passwords
    ✓ Generate cryptographically secure refresh
      token values
    ✓ Hash refresh tokens before persistence
    ✓ Create access JWTs
    ✓ Create refresh JWTs
    ✓ Verify JWTs

    Important:

    Raw refresh tokens must never be stored in
    MongoDB. Only their cryptographic hashes belong
    in the Session collection.
==================================================*/

import argon2 from "argon2";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import config from "../config/config.js";


/*==================================================
    Password Operations
==================================================*/

/*
    Hash a plaintext password using Argon2id.

    Argon2's default parameters are intentionally used
    here rather than weakening the password hashing
    configuration.
*/

export async function hashPassword(password) {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("Password must be a non-empty string.");
    }

    return argon2.hash(password, {
        type: argon2.argon2id
    });
}


/*
    Verify a plaintext password against an Argon2 hash.
*/

export async function verifyPassword(password, passwordHash) {
    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string" ||
        password.length === 0 ||
        passwordHash.length === 0
    ) {
        return false;
    }

    try {
        return await argon2.verify(passwordHash, password);
    } catch {
        return false;
    }
}


/*==================================================
    Refresh Token Operations
==================================================*/

/*
    Generate a cryptographically secure random value.

    This value becomes the secret material contained
    inside the refresh token.
*/

export function generateRefreshTokenSecret() {
    return crypto.randomBytes(64).toString("base64url");
}


/*
    Hash a refresh token before storing it.

    SHA-256 is appropriate here because refresh tokens
    are already generated from cryptographically secure
    random material and therefore have high entropy.
*/

export function generateSessionId() {
    return crypto.randomUUID();
}


/*
    Hash a refresh token before storing it.

    SHA-256 is appropriate here because refresh tokens
    are already generated from cryptographically secure
    random material and therefore have high entropy.
*/

export function hashRefreshToken(token) {
    if (typeof token !== "string" || token.length === 0) {
        throw new Error("Refresh token must be a non-empty string.");
    }

    return crypto
        .createHash("sha256")
        .update(token, "utf8")
        .digest("hex");
}


/*==================================================
    Duration Operations
==================================================*/

/*
    Convert a JWT-style duration into milliseconds.

    Supported units:

        s = seconds
        m = minutes
        h = hours
        d = days
*/

export function durationToMilliseconds(
    duration
) {
    if (
        typeof duration !== "string" ||
        !duration.trim()
    ) {
        throw new Error(
            "Duration must be a non-empty string."
        );
    }

    const match =
        duration
            .trim()
            .match(
                /^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/i
            );

    if (!match) {
        throw new Error(
            "Unsupported duration format."
        );
    }

    const value =
        Number(match[1]);

    const unit =
        match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}


/*==================================================
    JWT Operations
==================================================*/

/*
    Create a short-lived access token.

    Only stable authorization identity data belongs
    in the access-token payload.
*/

export function createAccessToken(
    user,
    sessionId
) {
    if (
        !user?._id ||
        !user?.role ||
        !sessionId
    ) {
        throw new Error(
            "User identity, role, and session ID are required."
        );
    }

    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role,
            sid: sessionId,
            type: "access"
        },
        config.jwt.accessSecret,
        {
            expiresIn:
                config.jwt.accessExpiresIn
        }
    );
}

/*
    Create a refresh token.

    The sessionId binds the refresh token to a specific
    server-side Session record.
*/

export function createRefreshToken(user, sessionId) {
    if (!user?._id || !sessionId) {
        throw new Error("User identity and session ID are required.");
    }

    return jwt.sign(
        {
            sub: user._id.toString(),
            sid: sessionId,
            type: "refresh"
        },
        config.jwt.refreshSecret,
        {
            expiresIn: config.jwt.refreshExpiresIn
        }
    );
}


/*
    Verify an access token and ensure it is actually
    an access token.
*/

export function verifyAccessToken(token) {
    const payload = jwt.verify(
        token,
        config.jwt.accessSecret
    );

 if (
    typeof payload !== "object" ||
    payload.type !== "access" ||
    !payload.sub ||
    !payload.sid
) {
    throw new Error("Invalid access token.");
}
    return payload;
}


/*
    Verify a refresh token and ensure it is actually
    a refresh token.
*/

export function verifyRefreshToken(token) {
    const payload = jwt.verify(
        token,
        config.jwt.refreshSecret
    );

    if (
        typeof payload !== "object" ||
        payload.type !== "refresh" ||
        !payload.sub ||
        !payload.sid
    ) {
        throw new Error("Invalid refresh token.");
    }

    return payload;
}


