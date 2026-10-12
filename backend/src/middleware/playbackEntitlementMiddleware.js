
"use strict";

import mongoose from "mongoose";
import PurchaseEntitlement from "../models/PurchaseEntitlement.js";

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

export async function requireMovieEntitlement(req, res, next) {
    // Authentication middleware should run before this middleware.
    const userId = req.user?.id;

    if (!mongoose.isValidObjectId(userId)) {
        return sendError(
            res,
            401,
            "Authentication required."
        );
    }

    const rawMovieId = req.params.movieId;

    if (
        typeof rawMovieId !== "string" ||
        !/^[1-9]\d*$/.test(rawMovieId)
    ) {
        return sendError(
            res,
            400,
            "Invalid movie ID."
        );
    }

    const movieId = Number(rawMovieId);

    if (!Number.isSafeInteger(movieId)) {
        return sendError(
            res,
            400,
            "Invalid movie ID."
        );
    }

    const now = new Date();

    try {
        const entitlement = await PurchaseEntitlement.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            status: "active",
            startsAt: { $lte: now },
            expiresAt: { $gt: now },
            revokedAt: null,
            $or: [
                {
                    purchaseType: "rental",
                    movieId
                },
                {
                    purchaseType: "subscription"
                }
            ]
        })
            .select("_id attemptId purchaseType movieId expiresAt")
            .lean();

        if (!entitlement) {
            return sendError(
                res,
                403,
                "An active purchase or subscription is required to watch this movie."
            );
        }

        req.playbackEntitlement = {
            id: entitlement._id.toString(),
            attemptId: entitlement.attemptId,
            purchaseType: entitlement.purchaseType,
            movieId: entitlement.movieId,
            expiresAt: entitlement.expiresAt
        };

        return next();
    } catch {
        // Fail closed: a database or authorization error must never
        // allow playback to continue without checking entitlement.
        return sendError(
            res,
            503,
            "Playback authorization is temporarily unavailable."
        );
    }
}
