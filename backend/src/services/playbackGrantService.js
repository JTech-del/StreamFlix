"use strict";

import jwt from "jsonwebtoken";
import config from "../config/config.js";

// Grants are purpose- and movie-scoped, short-lived JWTs signed with the
// established access-token key. The grant is not accepted by API auth middleware.
export function createPlaybackGrant({ userId, sessionId, movieId }) {
    if (!userId || !sessionId || !Number.isSafeInteger(movieId) || movieId < 1) {
        throw new Error("Valid playback grant identity is required.");
    }

    return jwt.sign(
        { sub: String(userId), sid: sessionId, type: "playback", purpose: "movie", movieId },
        config.jwt.accessSecret,
        {
            algorithm: config.jwt.algorithm,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
            expiresIn: config.playbackGrantTtlSeconds
        }
    );
}

export function verifyPlaybackGrant(token, expectedMovieId) {
    const payload = jwt.verify(token, config.jwt.accessSecret, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
    });

    if (
        typeof payload !== "object" ||
        payload.type !== "playback" ||
        payload.purpose !== "movie" ||
        !payload.sub ||
        !payload.sid ||
        !Number.isSafeInteger(payload.movieId) ||
        payload.movieId !== expectedMovieId
    ) {
        throw new Error("Invalid playback grant.");
    }

    return payload;
}
