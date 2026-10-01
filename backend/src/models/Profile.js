"use strict";

/*==================================================
    StreamFlix

    Profile Model

    Responsibility:

    ✓ Define user-facing profile information
    ✓ Associate exactly one profile with one user
    ✓ Store optional profile metadata
    ✓ Provide MongoDB ownership indexes

    MongoDB Collection:

        profiles

    Important:

    Authentication and account-security fields remain
    inside the User model.

    Profile ownership is established through userId.
    Client requests must never be trusted to choose
    the owning user.
==================================================*/

import mongoose from "mongoose";


/*==================================================
    Profile Schema
==================================================*/

const profileSchema = new mongoose.Schema(
    {

        /*------------------------------------------
            User Ownership

            Every profile belongs to exactly one
            StreamFlix user.

            The unique constraint enforces the
            one-user-to-one-profile relationship.
        ------------------------------------------*/

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },


        /*------------------------------------------
            Display Name
        ------------------------------------------*/

        displayName: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100
        },


        /*------------------------------------------
            First Name
        ------------------------------------------*/

        firstName: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100
        },


        /*------------------------------------------
            Last Name
        ------------------------------------------*/

        lastName: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100
        },


        /*------------------------------------------
            Biography
        ------------------------------------------*/

        bio: {
            type: String,
            default: null,
            trim: true,
            maxlength: 500
        },


        /*------------------------------------------
            Avatar URL

            Stored as a reference only.

            Avatar upload/storage infrastructure
            can be introduced separately later.
        ------------------------------------------*/

        avatarUrl: {
            type: String,
            default: null,
            trim: true,
            maxlength: 2048
        }

    },

    {

        timestamps: true,

        collection: "profiles"
    }
);


/*==================================================
    Export Model
==================================================*/

const Profile = mongoose.model(
    "Profile",
    profileSchema
);


export default Profile;
