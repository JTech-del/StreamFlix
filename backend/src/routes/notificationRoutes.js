"use strict";

import express from "express";

import {
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead
} from "../controllers/notificationController.js";

import {
    requireAuthentication
} from "../middleware/authMiddleware.js";

const router = express.Router();


/*==================================================
    Notification Routes
==================================================*/

/*
    Every notification operation belongs to
    the authenticated user.

    Ownership is determined exclusively by:

        req.user.id

    Never by a client-supplied userId.
*/


/*----------------------------------------------
    List Notifications
----------------------------------------------*/

router.get(
    "/",
    requireAuthentication,
    getNotifications
);


/*----------------------------------------------
    Unread Count
----------------------------------------------*/

router.get(
    "/unread-count",
    requireAuthentication,
    getUnreadCount
);


/*----------------------------------------------
    Mark All Read
----------------------------------------------*/

router.patch(
    "/read-all",
    requireAuthentication,
    markAllRead
);


/*----------------------------------------------
    Mark One Read
----------------------------------------------*/

router.patch(
    "/:notificationId/read",
    requireAuthentication,
    markRead
);


export default router;