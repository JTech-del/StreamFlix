"use strict";

import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { verifyPlaybackGrant } from "../services/playbackGrantService.js";
import { requireAuthentication } from "./authMiddleware.js";

function unauthorized(res) {
    return res.status(401).json({ success: false, message: "Playback authorization is invalid or expired." });
}

export async function requirePlaybackAuthentication(req, res, next) {
    res.set("Cache-Control", "no-store, private");
    res.set("Referrer-Policy", "no-referrer");
    const grant = req.query.grant;
    if (grant === undefined) {
        return requireAuthentication(req, res, next);
    }

    const movieId = Number(req.params.movieId);
    if (
        typeof grant !== "string" || grant.length > 4096 ||
        !/^[1-9]\d*$/.test(req.params.movieId || "") ||
        !Number.isSafeInteger(movieId)
    ) return unauthorized(res);

    let payload;
    try {
        payload = verifyPlaybackGrant(grant, movieId);
    } catch {
        // Never include the grant or the JWT library error in logs/responses.
        return unauthorized(res);
    }

    if (!mongoose.isValidObjectId(payload.sub)) return unauthorized(res);

    try {
        const session = await Session.findOne({ sessionId: payload.sid });
        if (
            !session || session.userId.toString() !== payload.sub || session.revokedAt ||
            (session.expiresAt && session.expiresAt <= new Date()) ||
            (session.absoluteExpiresAt && session.absoluteExpiresAt <= new Date())
        ) return unauthorized(res);

        const user = await User.findById(payload.sub);
        if (!user || user.status === "suspended" || user.status === "disabled") {
            return res.status(user ? 403 : 401).json({
                success: false,
                message: user ? "This account is not available." : "Authentication required."
            });
        }

        req.user = { id: user._id.toString(), role: user.role, sessionId: session.sessionId };
        return next();
    } catch {
        return res.status(503).json({ success: false, message: "Playback authorization is temporarily unavailable." });
    }
}
