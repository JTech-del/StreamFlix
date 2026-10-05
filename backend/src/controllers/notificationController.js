"use strict";

import {
    notificationListQuerySchema,
    notificationIdSchema
} from "../validation/notificationSchemas.js";

import {
    getUserNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead
} from "../services/notificationService.js";


/*==================================================
    Get Notifications
==================================================*/

export async function getNotifications(
    req,
    res
) {

    /*----------------------------------------------
        Validate Query
    ----------------------------------------------*/

    const validation =
        notificationListQuerySchema.safeParse(
            req.query
        );

    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid notification query.",

            errors:
                validation.error.issues.map(
                    issue => ({
                        field:
                            issue.path.join("."),

                        message:
                            issue.message
                    })
                )

        });

    }


    try {

        const result =
            await getUserNotifications(
                req.user.id,
                {
                    page:
                        validation.data.page,

                    limit:
                        validation.data.limit,

                    unreadOnly:
                        validation.data.unreadOnly === "true"
                }
            );

        return res.status(200).json({

            success: true,

            data: result

        });

    } catch (error) {

        console.error(
            "Get notifications failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load notifications."

        });

    }

}


/*==================================================
    Get Unread Count
==================================================*/

export async function getUnreadCount(
    req,
    res
) {

    try {

        const count =
            await getUnreadNotificationCount(
                req.user.id
            );

        return res.status(200).json({

            success: true,

            data: {
                count
            }

        });

    } catch (error) {

        console.error(
            "Get unread notification count failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load unread notification count."

        });

    }

}


/*==================================================
    Mark Notification Read
==================================================*/

export async function markRead(
    req,
    res
) {

    /*----------------------------------------------
        Validate Notification ID
    ----------------------------------------------*/

    const validation =
        notificationIdSchema.safeParse(
            req.params.notificationId
        );

    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid notification ID."

        });

    }


    try {

        const notification =
            await markNotificationRead(
                req.user.id,
                validation.data
            );

        if (!notification) {

            return res.status(404).json({

                success: false,

                message:
                    "Notification not found."

            });

        }

        return res.status(200).json({

            success: true,

            message:
                "Notification marked as read.",

            data: {
                notification
            }

        });

    } catch (error) {

        console.error(
            "Mark notification read failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update notification."

        });

    }

}


/*==================================================
    Mark All Notifications Read
==================================================*/

export async function markAllRead(
    req,
    res
) {

    try {

        const result =
            await markAllNotificationsRead(
                req.user.id
            );

        return res.status(200).json({

            success: true,

            message:
                "Notifications marked as read.",

            data: result

        });

    } catch (error) {

        console.error(
            "Mark all notifications read failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update notifications."

        });

    }

}