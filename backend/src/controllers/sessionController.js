"use strict";

import Session from "../models/Session.js";

export async function listSessions(
    req,
    res
) {
    try {
        const sessions =
            await Session
                .find({
                    userId: req.user.id,
                    revokedAt: null,
                    expiresAt: {
                        $gt: new Date()
                    }
                })
                .select(
                    "-refreshTokenHash"
                )
                .sort({
                    lastUsedAt: -1,
                    createdAt: -1
                })
                .lean();

        return res.status(200).json({
            success: true,
            data: {
                sessions: sessions.map(
                    session => ({
                        sessionId:
                            session.sessionId,

                        device:
                            session.device,

                        ipAddress:
                            session.ipAddress,

                        userAgent:
                            session.userAgent,

                        createdAt:
                            session.createdAt,

                        lastUsedAt:
                            session.lastUsedAt,

                        expiresAt:
                            session.expiresAt,

                        isCurrent:
                            session.sessionId ===
                            req.user.sessionId
                    })
                )
            }
        });

    } catch (error) {

        console.error(
            "Failed to list sessions:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to retrieve sessions."
        });
    }
}

export async function revokeSession(
    req,
    res
) {
    try {
        const { sessionId } = req.params;

        if (
            typeof sessionId !== "string" ||
            sessionId.trim().length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required."
            });
        }

        const session =
            await Session.findOne({
                sessionId: sessionId.trim(),
                userId: req.user.id
            });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found."
            });
        }

        if (session.revokedAt) {
            return res.status(200).json({
                success: true,
                message: "Session is already revoked."
            });
        }

        session.revokedAt = new Date();
        session.revocationReason = "user_revoked";

        await session.save();

        return res.status(200).json({
            success: true,
            message: "Session revoked successfully."
        });

    } catch (error) {

        console.error(
            "Failed to revoke session:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to revoke session."
        });
    }
}

export async function logoutOtherSessions(
    req,
    res
) {
    try {
        const result =
            await Session.updateMany(
                {
                    userId: req.user.id,
                    sessionId: {
                        $ne: req.user.sessionId
                    },
                    revokedAt: null,
                    expiresAt: {
                        $gt: new Date()
                    }
                },
                {
                    $set: {
                        revokedAt: new Date(),
                        revocationReason:
                            "logout_others"
                    }
                }
            );

        return res.status(200).json({
            success: true,
            message:
                "Other sessions logged out successfully.",
            data: {
                revokedCount:
                    result.modifiedCount
            }
        });

    } catch (error) {

        console.error(
            "Failed to logout other sessions:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to logout other sessions."
        });
    }
}
