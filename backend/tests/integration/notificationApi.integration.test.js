"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

import {
    loginRateLimiter
} from "../../src/middleware/authRateLimiters.js";


/*==================================================
    Test Database
==================================================*/

const mongoServer =
    await MongoMemoryReplSet.create({
        replSet: {
            count: 1
        }
    });

process.env.MONGODB_URI =
    mongoServer.getUri(
        "streamflix_notification_api_test"
    );

const { app } =
    await import("../../src/server.js");

const {
    connectDatabase,
    disconnectDatabase
} =
    await import("../../src/config/database.js");

const User =
    (await import("../../src/models/User.js")).default;

const Notification =
    (await import("../../src/models/Notification.js")).default;

const {
    hashPassword
} =
    await import("../../src/services/authService.js");


await connectDatabase();


/*==================================================
    Test Lifecycle
==================================================*/

test.after(async () => {

    await mongoose.connection.dropDatabase();

    await disconnectDatabase();

    await mongoServer.stop();

});


test.afterEach(async () => {

    await loginRateLimiter.resetKey(
        "127.0.0.1"
    );

});


/*==================================================
    Test Helpers
==================================================*/

async function createAuthenticatedUser(
    email
) {

    const password =
        "StrongPassword123!";

    const passwordHash =
        await hashPassword(
            password
        );

    const user =
        await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

    const loginResponse =
        await request(app)
            .post("/api/auth/login")
            .send({
                email,
                password
            });

    assert.equal(
        loginResponse.status,
        200
    );

    assert.equal(
        loginResponse.body.success,
        true
    );

    return {
        user,
        accessToken:
            loginResponse.body.data.accessToken
    };

}


async function createNotification(
    userId,
    overrides = {}
) {

    return Notification.create({
        notificationId:
            new mongoose.Types.ObjectId().toString(),

        recipientUserId:
            userId,

        type:
            "movie.published",

        title:
            "New movie available",

        message:
            "A new movie has been published.",

        link:
            "/movies/1",

        metadata: {
            movieId: 1
        },

        dedupeKey:
            `test-${new mongoose.Types.ObjectId().toString()}`,

        ...overrides
    });

}


/*==================================================
    Authentication Boundary
==================================================*/

test(
    "GET /api/notifications rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .get("/api/notifications");

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            response.body.success,
            false
        );

    }
);


test(
    "GET /api/notifications/unread-count rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .get(
                    "/api/notifications/unread-count"
                );

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            response.body.success,
            false
        );

    }
);


test(
    "PATCH /api/notifications/:notificationId/read rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .patch(
                    "/api/notifications/test-id/read"
                );

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            response.body.success,
            false
        );

    }
);


test(
    "PATCH /api/notifications/read-all rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .patch(
                    "/api/notifications/read-all"
                );

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            response.body.success,
            false
        );

    }
);


/*==================================================
    Notification Ownership
==================================================*/

test(
    "Authenticated user receives only their own notifications",
    async () => {

        const firstUser =
            await createAuthenticatedUser(
                "notification-owner-a@example.com"
            );

        const secondUser =
            await createAuthenticatedUser(
                "notification-owner-b@example.com"
            );

        await createNotification(
            firstUser.user._id,
            {
                title:
                    "User A notification",
                dedupeKey:
                    "notification-owner-a-1"
            }
        );

        await createNotification(
            secondUser.user._id,
            {
                title:
                    "User B notification",
                dedupeKey:
                    "notification-owner-b-1"
            }
        );

        const response =
            await request(app)
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${firstUser.accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        const notifications =
            response.body.data.notifications;

        assert.equal(
            notifications.length,
            1
        );

        assert.equal(
            notifications[0].title,
            "User A notification"
        );

        assert.equal(
            notifications[0].recipientUserId,
            firstUser.user._id.toString()
        );

        assert.equal(
            notifications.some(
                notification =>
                    notification.title ===
                    "User B notification"
            ),
            false
        );

    }
);


/*==================================================
    Pagination
==================================================*/

test(
    "GET /api/notifications supports pagination",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-pagination@example.com"
            );

        for (let index = 1; index <= 3; index++) {

            await createNotification(
                user._id,
                {
                    title:
                        `Notification ${index}`,

                    dedupeKey:
                        `notification-pagination-${index}`
                }
            );

        }

        const response =
            await request(app)
                .get(
                    "/api/notifications?page=1&limit=2"
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.data.notifications.length,
            2
        );

        assert.equal(
            response.body.data.pagination.page,
            1
        );

        assert.equal(
            response.body.data.pagination.limit,
            2
        );

        assert.equal(
            response.body.data.pagination.total,
            3
        );

        assert.equal(
            response.body.data.pagination.totalPages,
            2
        );

    }
);


/*==================================================
    Unread Filtering
==================================================*/

test(
    "GET /api/notifications supports unreadOnly filtering",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-unread-filter@example.com"
            );

        await createNotification(
            user._id,
            {
                title:
                    "Unread notification",
                dedupeKey:
                    "notification-unread-1"
            }
        );

        await createNotification(
            user._id,
            {
                title:
                    "Read notification",
                dedupeKey:
                    "notification-read-1",
                readAt:
                    new Date()
            }
        );

        const response =
            await request(app)
                .get(
                    "/api/notifications?unreadOnly=true"
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.data.notifications.length,
            1
        );

        assert.equal(
            response.body.data.notifications[0].title,
            "Unread notification"
        );

        assert.equal(
            response.body.data.pagination.total,
            1
        );

    }
);


/*==================================================
    Query Validation
==================================================*/

test(
    "GET /api/notifications rejects invalid query values",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-invalid-query@example.com"
            );

        const response =
            await request(app)
                .get(
                    "/api/notifications?page=0&limit=100"
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.message,
            "Invalid notification query."
        );

    }
);


/*==================================================
    Unread Count
==================================================*/

test(
    "GET /api/notifications/unread-count returns only the authenticated user's unread count",
    async () => {

        const firstUser =
            await createAuthenticatedUser(
                "notification-count-a@example.com"
            );

        const secondUser =
            await createAuthenticatedUser(
                "notification-count-b@example.com"
            );

        await createNotification(
            firstUser.user._id,
            {
                dedupeKey:
                    "notification-count-a-1"
            }
        );

        await createNotification(
            firstUser.user._id,
            {
                dedupeKey:
                    "notification-count-a-2"
            }
        );

        await createNotification(
            firstUser.user._id,
            {
                dedupeKey:
                    "notification-count-a-3",
                readAt:
                    new Date()
            }
        );

        await createNotification(
            secondUser.user._id,
            {
                dedupeKey:
                    "notification-count-b-1"
            }
        );

        const response =
            await request(app)
                .get(
                    "/api/notifications/unread-count"
                )
                .set(
                    "Authorization",
                    `Bearer ${firstUser.accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.data.count,
            2
        );

    }
);


/*==================================================
    Mark Read
==================================================*/

test(
    "Owner can mark their notification as read",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-mark-read@example.com"
            );

        const notification =
            await createNotification(
                user._id,
                {
                    dedupeKey:
                        "notification-mark-read-1"
                }
            );

        const response =
            await request(app)
                .patch(
                    `/api/notifications/${notification.notificationId}/read`
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.message,
            "Notification marked as read."
        );

        assert.ok(
            response.body.data.notification
        );

        assert.ok(
            response.body.data.notification.readAt
        );

        const storedNotification =
            await Notification.findOne({
                notificationId:
                    notification.notificationId
            });

        assert.ok(
            storedNotification.readAt
        );

    }
);


/*==================================================
    IDOR Protection
==================================================*/

test(
    "User cannot mark another user's notification as read",
    async () => {

        const owner =
            await createAuthenticatedUser(
                "notification-idor-owner@example.com"
            );

        const attacker =
            await createAuthenticatedUser(
                "notification-idor-attacker@example.com"
            );

        const notification =
            await createNotification(
                owner.user._id,
                {
                    dedupeKey:
                        "notification-idor-1"
                }
            );

        const response =
            await request(app)
                .patch(
                    `/api/notifications/${notification.notificationId}/read`
                )
                .set(
                    "Authorization",
                    `Bearer ${attacker.accessToken}`
                );

        assert.equal(
            response.status,
            404
        );

        assert.equal(
            response.body.success,
            false
        );

        const storedNotification =
            await Notification.findOne({
                notificationId:
                    notification.notificationId
            });

        assert.equal(
            storedNotification.readAt,
            null
        );

    }
);


/*==================================================
    Notification ID Validation
==================================================*/

test(
    "PATCH /api/notifications/:notificationId/read rejects an invalid notification ID",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-invalid-id@example.com"
            );

        const response =
            await request(app)
                .patch(
                    "/api/notifications//read"
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.notEqual(
            response.status,
            500
        );

    }
);


/*==================================================
    Mark All
==================================================*/

test(
    "Mark all notifications read affects only the authenticated user",
    async () => {

        const firstUser =
            await createAuthenticatedUser(
                "notification-mark-all-a@example.com"
            );

        const secondUser =
            await createAuthenticatedUser(
                "notification-mark-all-b@example.com"
            );

        await createNotification(
            firstUser.user._id,
            {
                dedupeKey:
                    "notification-mark-all-a-1"
            }
        );

        await createNotification(
            firstUser.user._id,
            {
                dedupeKey:
                    "notification-mark-all-a-2"
            }
        );

        await createNotification(
            secondUser.user._id,
            {
                dedupeKey:
                    "notification-mark-all-b-1"
            }
        );

        const response =
            await request(app)
                .patch(
                    "/api/notifications/read-all"
                )
                .set(
                    "Authorization",
                    `Bearer ${firstUser.accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.data.modifiedCount,
            2
        );

        const firstUnreadCount =
            await Notification.countDocuments({
                recipientUserId:
                    firstUser.user._id,
                readAt:
                    null
            });

        const secondUnreadCount =
            await Notification.countDocuments({
                recipientUserId:
                    secondUser.user._id,
                readAt:
                    null
            });

        assert.equal(
            firstUnreadCount,
            0
        );

        assert.equal(
            secondUnreadCount,
            1
        );

    }
);


/*==================================================
    Client-Supplied User ID Protection
==================================================*/

test(
    "Notification API does not accept a client-supplied userId",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "notification-userid-injection@example.com"
            );

        await createNotification(
            user._id,
            {
                dedupeKey:
                    "notification-userid-injection-1"
            }
        );

        const response =
            await request(app)
                .get(
                    `/api/notifications?userId=${new mongoose.Types.ObjectId().toString()}`
                )
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            response.body.success, 
            false
        );

        assert.equal(
            response.body.message,
            "Invalid notification query."
        );

    }
);