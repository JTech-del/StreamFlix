"use strict";

/*==================================================
    StreamFlix

    Authentication Middleware

    Responsibility:

    ✓ Extract access token from Authorization header
    ✓ Verify access JWT
    ✓ Verify persistent session state
    ✓ Verify session ownership
    ✓ Verify account state
    ✓ Attach trusted identity to req.user
    ✓ Reject missing, invalid, revoked, or expired access

    Does NOT handle:

    ✗ Refresh tokens
    ✗ Password verification
    ✗ Role authorization
    ✗ Admin authorization
==================================================*/

import {
    verifyAccessToken
} from "../services/authService.js";

import Session from "../models/Session.js";
import User from "../models/User.js";


/*==================================================
    Require Authentication
==================================================*/

export async function requireAuthentication(
    req,
    res,
    next
) {

    /*----------------------------------------------
        Read Authorization Header
    ----------------------------------------------*/

    const authorization =
        req.headers.authorization;


    if (
        typeof authorization !== "string" ||
        authorization.length === 0
    ) {

        return res.status(401).json({

            success: false,

            message: "Authentication required."

        });

    }


    /*----------------------------------------------
        Extract Bearer Token
    ----------------------------------------------*/
const parts =
    authorization.trim().split(/\s+/);

if (
    parts.length !== 2 ||
    parts[0]?.toLowerCase() !== "bearer" ||
    !parts[1]
) {


return res.status(401).json({
        success: false,
        message: "Invalid authentication header."
    });

}

const token = parts[1];

    /*----------------------------------------------
        Verify Access JWT
    ----------------------------------------------*/

    let payload;

    try {

        payload =
            verifyAccessToken(
                token
            );

    } catch {

        return res.status(401).json({

            success: false,

            message: "Invalid or expired access token."

        });

    }


    try {

        /*------------------------------------------
            Verify Persistent Session
        ------------------------------------------*/

        const session =
            await Session.findOne({
                sessionId: payload.sid
            });


        if (!session) {

            return res.status(401).json({

                success: false,

                message: "Session is no longer valid."

            });

        }


        /*------------------------------------------
            Verify Session Ownership
        ------------------------------------------*/

        if (
            session.userId.toString() !==
            payload.sub
        ) {

            return res.status(401).json({

                success: false,

                message: "Session is no longer valid."

            });

        }


        /*------------------------------------------
            Reject Revoked Session
        ------------------------------------------*/

        if (session.revokedAt) {

            return res.status(401).json({

                success: false,

                message: "Session is no longer valid."

            });

        }


        /*------------------------------------------
            Reject Expired Session
        ------------------------------------------*/

        if (
            session.expiresAt &&
            session.expiresAt <= new Date()
        ) {

            return res.status(401).json({

                success: false,

                message: "Session is no longer valid."

            });

        }


        /*------------------------------------------
            Verify Current Account State
        ------------------------------------------*/

        const user =
            await User.findById(
                payload.sub
            );


        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        if (
            user.status === "suspended" ||
            user.status === "disabled"
        ) {

            return res.status(403).json({

                success: false,

                message: "This account is not available."

            });

        }


        /*------------------------------------------
            Update Session Activity
        ------------------------------------------*/

        session.lastUsedAt =
            new Date();

        await session.save();


        /*------------------------------------------
            Attach Trusted Identity
        ------------------------------------------*/

        req.user = {

            id: user._id.toString(),

            role: user.role,

            sessionId: session.sessionId

        };


        return next();

    } catch {

        return res.status(500).json({

            success: false,

            message: "Authentication service unavailable."

        });

    }

}