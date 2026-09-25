"use strict";

/*==================================================
    StreamFlix

    Verification Token Model

    Responsibility:

    ✓ Store email verification tokens
    ✓ Store password reset tokens
    ✓ Store only cryptographic token hashes
    ✓ Associate tokens with users
    ✓ Define token purpose
    ✓ Enforce token expiration
    ✓ Support one-time token use
    ✓ Support token revocation
    ✓ Automatically remove expired tokens

    MongoDB Collection:

        verificationtokens

    Security:

        Raw tokens are NEVER stored.

        Only a cryptographic hash of the token
        is persisted in MongoDB.
==================================================*/

import mongoose from "mongoose";

const verificationTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
            select: false
        },

        purpose: {
            type: String,
            enum: [
                "email_verification",
                "password_reset"
            ],
            required: true,
            index: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        usedAt: {
            type: Date,
            default: null,
            index: true
        },

        revokedAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true,
        collection: "verificationtokens"
    }
);

verificationTokenSchema.index({
    userId: 1,
    purpose: 1,
    usedAt: 1,
    revokedAt: 1
});

verificationTokenSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0
    }
);

const VerificationToken = mongoose.model(
    "VerificationToken",
    verificationTokenSchema
);

export default VerificationToken;
