"use strict";

/*==================================================
    StreamFlix

    User Model

    Responsibility:

    ✓ Define StreamFlix account identity
    ✓ Validate account credentials metadata
    ✓ Define account roles
    ✓ Define account status
    ✓ Track email verification state
    ✓ Track last login
    ✓ Provide MongoDB indexes
    ✓ Prevent password hash from normal JSON output

    MongoDB Collection:

        users

    Important:

    Authentication sessions / refresh tokens are
    intentionally NOT stored in this document.
    They will use a dedicated session model.
==================================================*/

import mongoose from "mongoose";


/*==================================================
    User Schema
==================================================*/

const userSchema = new mongoose.Schema(
    {

        /*------------------------------------------
            Email Address

            Email is the primary login identifier.
            It is normalized before storage.
        ------------------------------------------*/

        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },


        /*------------------------------------------
            Password Hash

            Plaintext passwords must NEVER be stored.

            Argon2id will generate the hash in the
            authentication service before persistence.
        ------------------------------------------*/

        passwordHash: {
            type: String,
            required: true,
            select: false
        },


        /*------------------------------------------
            Account Role

            Normal users receive "user".

            Administrative privileges are explicitly
            assigned through the "admin" role.
        ------------------------------------------*/

        role: {
            type: String,
            enum: [
                "user",
                "admin"
            ],
            default: "user",
            required: true,
            index: true
        },


        /*------------------------------------------
            Account Status

            Allows accounts to be disabled without
            deleting historical account relationships.
        ------------------------------------------*/

        status: {
            type: String,
            enum: [
                "active",
                "suspended",
                "disabled"
            ],
            default: "active",
            required: true,
            index: true
        },


        /*------------------------------------------
            Email Verification

            Authentication does not assume that an
            email address has already been verified.
        ------------------------------------------*/

        emailVerified: {
            type: Boolean,
            default: false,
            index: true
        },


        /*------------------------------------------
            Last Login

            Used for account activity and security
            monitoring.
        ------------------------------------------*/

        lastLoginAt: {
            type: Date,
            default: null
        }

    },

    {
        timestamps: true,

        collection: "users"
    }
);


/*==================================================
    Additional Indexes
==================================================*/

/*
    Useful for administrative account queries.
*/

userSchema.index({
    role: 1,
    status: 1
});


/*
    Useful for verification/account-state queries.
*/

userSchema.index({
    emailVerified: 1,
    status: 1
});


/*==================================================
    Safe JSON Serialization
==================================================*/

/*
    passwordHash uses select:false, so normal queries
    will not return it.

    This transform provides an additional safeguard
    if a document is explicitly serialized.
*/

userSchema.set(
    "toJSON",
    {
        transform: (_document, returnedObject) => {

            delete returnedObject.passwordHash;

            return returnedObject;

        }
    }
);


/*==================================================
    Export Model
==================================================*/

const User = mongoose.model(
    "User",
    userSchema
);


export default User;
