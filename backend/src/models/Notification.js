"use strict";

import mongoose from "mongoose";

/*==================================================
    StreamFlix

    Notification Model

    Responsibility:

    ✓ Store user-facing notifications
    ✓ Enforce notification ownership boundary
    ✓ Provide notification idempotency
    ✓ Track read state
    ✓ Provide recipient/query indexes

    Important:

    Notifications are created by trusted backend
    services/workers.

    Normal clients must NEVER supply the
    recipientUserId when creating notifications.
==================================================*/

const notificationSchema = new mongoose.Schema(
    {

        /*------------------------------------------
            Notification ID

            Application-level identifier.

            MongoDB _id remains the database
            identifier.
        ------------------------------------------*/

        notificationId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },


        /*------------------------------------------
            Recipient

            References the authenticated StreamFlix
            user who owns this notification.
        ------------------------------------------*/

        recipientUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        /*------------------------------------------
            Notification Type

            Keep this allowlisted.

            Additional notification types can be
            introduced deliberately as the product
            grows.
        ------------------------------------------*/

        type: {
            type: String,
            required: true,
            enum: [
                "movie.published",
                "movie.upcoming",
                "account.security",
                "system"
            ],
            index: true
        },


        /*------------------------------------------
            Title
        ------------------------------------------*/

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },


        /*------------------------------------------
            Message
        ------------------------------------------*/

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },


        /*------------------------------------------
            Internal Application Link

            This is intentionally just a string.

            Notification services must only generate
            trusted internal application routes.

            Clients cannot create notifications.
        ------------------------------------------*/

        link: {
            type: String,
            default: null,
            trim: true,
            maxlength: 2048
        },


        /*------------------------------------------
            Supplemental Metadata

            This is not an authorization source.

            Authorization must always use the
            authenticated recipient identity.
        ------------------------------------------*/

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },


        /*------------------------------------------
            Idempotency Boundary

            A notification-producing operation must
            generate a deterministic dedupe key.

            MongoDB uniqueness prevents duplicate
            user-visible notifications.
        ------------------------------------------*/

        dedupeKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            maxlength: 500
        },


        /*------------------------------------------
            Read State

            null = unread
            Date = read
        ------------------------------------------*/

        readAt: {
            type: Date,
            default: null,
            index: true
        }

    },

    {
        timestamps: true,

        collection: "notifications"
    }
);


/*==================================================
    Query Indexes
==================================================*/

/*
    Main notification feed.

    Newest notifications first.
*/

notificationSchema.index({
    recipientUserId: 1,
    createdAt: -1
});


/*
    Unread notification queries.

    Newest unread notifications first.
*/

notificationSchema.index({
    recipientUserId: 1,
    readAt: 1,
    createdAt: -1
});


/*==================================================
    Export Model
==================================================*/

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;
