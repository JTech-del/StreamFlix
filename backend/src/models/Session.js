"use strict";

/*==================================================
    StreamFlix

    Session Model

    Responsibility:

    ✓ Define authenticated user sessions
    ✓ Store hashed refresh-token references
    ✓ Track session ownership
    ✓ Track device/session metadata
    ✓ Support token expiration
    ✓ Support session revocation
    ✓ Support session activity tracking
    ✓ Provide MongoDB indexes

    MongoDB Collection:

        sessions

    Security:

        Raw refresh tokens are NEVER stored.

        Only a cryptographic hash of the refresh
        token is persisted.
==================================================*/

import mongoose from "mongoose";


/*==================================================
    Session Schema
==================================================*/

const sessionSchema = new mongoose.Schema(
    {

        /*------------------------------------------
            User Ownership

            Every session belongs to exactly one
            StreamFlix user.
        ------------------------------------------*/

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        /*------------------------------------------
            Refresh Token Hash

            The raw refresh token exists only on the
            client/server exchange.

            MongoDB stores the hash.
        ------------------------------------------*/

        refreshTokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
            select: false
        },


        /*------------------------------------------
            Session Identifier

            Provides a non-secret identifier for
            session management and auditing.
        ------------------------------------------*/

        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },


        /*------------------------------------------
            Device Information

            Optional metadata used to help users and
            administrators identify active sessions.
        ------------------------------------------*/

        device: {
            type: String,
            default: null,
            trim: true,
            maxlength: 200
        },


        /*------------------------------------------
            IP Address

            Used for security auditing.

            This should be treated as metadata and
            not as a permanent identity attribute.
        ------------------------------------------*/

        ipAddress: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100
        },


        /*------------------------------------------
            User Agent

            Stores the browser/client identifier
            associated with the session.
        ------------------------------------------*/

        userAgent: {
            type: String,
            default: null,
            trim: true,
            maxlength: 1000
        },


        /*------------------------------------------
            Session Expiration

            Refresh sessions are finite-lived and
            must expire.
        ------------------------------------------*/

   expiresAt: {
    type: Date,
    required: true
},


        /*------------------------------------------
            Last Used

            Tracks the most recent successful use
            of this session.
        ------------------------------------------*/

        lastUsedAt: {
            type: Date,
            default: null
        },


        /*------------------------------------------
            Revocation

            A revoked session cannot be used for
            further token rotation.
        ------------------------------------------*/

        revokedAt: {
            type: Date,
            default: null,
            index: true
        },


        /*------------------------------------------
            Revocation Reason

            Useful for security auditing.
        ------------------------------------------*/

        revocationReason: {
            type: String,
            default: null,
            trim: true,
            maxlength: 200
        }

    },

    {

        timestamps: true,

        collection: "sessions"
    }
);


/*==================================================
    Compound Indexes
==================================================*/

/*
    Efficiently retrieve active sessions belonging
    to a user.
*/

sessionSchema.index({
    userId: 1,
    revokedAt: 1,
    expiresAt: 1
});


/*
    Efficiently locate active sessions by expiry.
*/

sessionSchema.index({
    expiresAt: 1,
    revokedAt: 1
});


/*
    Automatically remove sessions after their
    refresh-session expiration time.

    MongoDB TTL cleanup is handled automatically.
*/

sessionSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0
    }
);


/*==================================================
    Export Model
==================================================*/

const Session = mongoose.model(
    "Session",
    sessionSchema
);


export default Session;

