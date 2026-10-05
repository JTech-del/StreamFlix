"use strict";

import { randomUUID } from "node:crypto";

import Notification from "../models/Notification.js";
import {
    createNotificationSchema
} from "../validation/notificationSchemas.js";


/*==================================================
    Notification Service
==================================================*/


/*------------------------------------------
    Create Notification

    This is an internal server-side operation.

    The worker/orchestration layer will eventually
    call this service.

    dedupeKey is the final idempotency boundary.
------------------------------------------*/

export async function createNotification(data) {

    const validated =
        createNotificationSchema.parse(data);

    const notification =
        new Notification({
            notificationId: randomUUID(),

            recipientUserId:
                validated.recipientUserId,

            type:
                validated.type,

            title:
                validated.title,

            message:
                validated.message,

            link:
                validated.link ?? null,

            metadata:
                validated.metadata,

            dedupeKey:
                validated.dedupeKey
        });

    try {

        await notification.save();

        return notification;

    } catch (error) {

        /*
            MongoDB duplicate-key protection is the
            final idempotency boundary.

            The unique dedupeKey index guarantees that
            concurrent duplicate deliveries cannot
            create two notifications.
        */

        if (error?.code === 11000) {

            const existing =
                await Notification.findOne({
                    dedupeKey:
                        validated.dedupeKey
                }).lean();

            if (existing) {
                return existing;
            }
        }

        throw error;
    }
}


/*------------------------------------------
    Get User Notifications
------------------------------------------*/

export async function getUserNotifications(
    userId,
    {
        page = 1,
        limit = 20,
        unreadOnly = false
    } = {}
) {

    const safePage = Math.max(
        1,
        Number(page)
    );

    const safeLimit = Math.min(
        50,
        Math.max(1, Number(limit))
    );

    const filter = {
        recipientUserId: userId
    };

    if (unreadOnly) {
        filter.readAt = null;
    }

    const skip =
        (safePage - 1) * safeLimit;

    const [
        notifications,
        total
    ] = await Promise.all([
        Notification
            .find(filter)
            .sort({
                createdAt: -1
            })
            .skip(skip)
            .limit(safeLimit)
            .lean(),

        Notification.countDocuments(filter)
    ]);

    return {
        notifications,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages:
                Math.ceil(total / safeLimit)
        }
    };
}


/*------------------------------------------
    Get Unread Count
------------------------------------------*/

export async function getUnreadNotificationCount(
    userId
) {

    return Notification.countDocuments({
        recipientUserId: userId,
        readAt: null
    });
}


/*------------------------------------------
    Mark One Notification Read
------------------------------------------

    IMPORTANT:

    Ownership is enforced directly in the query.

    Therefore a valid notificationId belonging
    to another user is indistinguishable from
    "not found" from the caller's perspective.
------------------------------------------*/

export async function markNotificationRead(
    userId,
    notificationId
) {

    return Notification.findOneAndUpdate(
        {
            notificationId,
            recipientUserId: userId
        },
        {
            $set: {
                readAt: new Date()
            }
        },
        {
            returnDocument: "after"
        }
    ).lean();
}


/*------------------------------------------
    Mark All Notifications Read
------------------------------------------*/

export async function markAllNotificationsRead(
    userId
) {

    const result =
        await Notification.updateMany(
            {
                recipientUserId: userId,
                readAt: null
            },
            {
                $set: {
                    readAt: new Date()
                }
            }
        );

    return {
        modifiedCount:
            result.modifiedCount
    };
}
