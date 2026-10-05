"use strict";

import {
    describe,
    test,
    before,
    afterEach,
    after
} from "node:test";

import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../../src/models/User.js";
import Notification from "../../src/models/Notification.js";

import {
    createNotification,
    getUserNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead
} from "../../src/services/notificationService.js";

let mongoServer;

async function createTestUser(email) {
    return User.create({
        email,
        passwordHash: "test-password-hash"
    });
}

describe("Notification Service", () => {

  before(async () => {
    mongoServer =
        await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri()
    );

    await User.init();
    await Notification.init();
});

    afterEach(async () => {
        await Promise.all([
            User.deleteMany({}),
            Notification.deleteMany({})
        ]);
    });

    after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    test("creates a notification", async () => {

        const user =
            await createTestUser(
                "notification-user@example.com"
            );

        const notification =
            await createNotification({
                recipientUserId:
                    user._id.toString(),

                type:
                    "movie.published",

                title:
                    "New movie available",

                message:
                    "A new movie is now available.",

                link:
                    "/movie/test-movie",

                metadata: {
                    movieId: 123
                },

                dedupeKey:
                    `movie.published:123:${user._id}`
            });

        assert.ok(
            notification.notificationId
        );

        assert.equal(
            notification.recipientUserId.toString(),
            user._id.toString()
        );

        assert.equal(
            notification.type,
            "movie.published"
        );

        assert.equal(
            notification.readAt,
            null
        );
    });

    test(
        "returns the existing notification for duplicate dedupeKey",
        async () => {

            const user =
                await createTestUser(
                    "duplicate-user@example.com"
                );

            const data = {
                recipientUserId:
                    user._id.toString(),

                type:
                    "movie.published",

                title:
                    "New movie available",

                message:
                    "A new movie is now available.",

                link:
                    "/movie/test-movie",

                metadata: {
                    movieId: 123
                },

                dedupeKey:
                    `movie.published:123:${user._id}`
            };

            const first =
                await createNotification(data);

            const second =
                await createNotification(data);

            assert.equal(
                second._id.toString(),
                first._id.toString()
            );

            assert.equal(
                await Notification.countDocuments({}),
                1
            );
        }
    );

    test(
        "allows different recipients to have independent notifications",
        async () => {

            const userA =
                await createTestUser(
                    "notification-a@example.com"
                );

            const userB =
                await createTestUser(
                    "notification-b@example.com"
                );

            await createNotification({
                recipientUserId:
                    userA._id.toString(),

                type:
                    "movie.published",

                title:
                    "New movie available",

                message:
                    "Movie A is available.",

                dedupeKey:
                    `movie.published:123:${userA._id}`
            });

            await createNotification({
                recipientUserId:
                    userB._id.toString(),

                type:
                    "movie.published",

                title:
                    "New movie available",

                message:
                    "Movie A is available.",

                dedupeKey:
                    `movie.published:123:${userB._id}`
            });

            assert.equal(
                await Notification.countDocuments({}),
                2
            );
        }
    );

    test(
        "lists only the authenticated user's notifications",
        async () => {

            const userA =
                await createTestUser(
                    "list-a@example.com"
                );

            const userB =
                await createTestUser(
                    "list-b@example.com"
                );

            await createNotification({
                recipientUserId:
                    userA._id.toString(),

                type:
                    "system",

                title:
                    "User A",

                message:
                    "Notification for A.",

                dedupeKey:
                    `system:a:${userA._id}`
            });

            await createNotification({
                recipientUserId:
                    userB._id.toString(),

                type:
                    "system",

                title:
                    "User B",

                message:
                    "Notification for B.",

                dedupeKey:
                    `system:b:${userB._id}`
            });

            const result =
                await getUserNotifications(
                    userA._id,
                    {
                        page: 1,
                        limit: 20
                    }
                );

            assert.equal(
                result.notifications.length,
                1
            );

            assert.equal(
                result.notifications[0].title,
                "User A"
            );

            assert.equal(
                result.pagination.total,
                1
            );
        }
    );

    test(
        "filters unread notifications",
        async () => {

            const user =
                await createTestUser(
                    "unread@example.com"
                );

            const unread =
                await createNotification({
                    recipientUserId:
                        user._id.toString(),

                    type:
                        "system",

                    title:
                        "Unread",

                    message:
                        "Unread notification.",

                    dedupeKey:
                        `system:unread:${user._id}`
                });

            const read =
                await createNotification({
                    recipientUserId:
                        user._id.toString(),

                    type:
                        "system",

                    title:
                        "Read",

                    message:
                        "Read notification.",

                    dedupeKey:
                        `system:read:${user._id}`
                });

            await markNotificationRead(
                user._id,
                read.notificationId
            );

            const result =
                await getUserNotifications(
                    user._id,
                    {
                        unreadOnly: true
                    }
                );

            assert.equal(
                result.notifications.length,
                1
            );

            assert.equal(
                result.notifications[0].notificationId,
                unread.notificationId
            );

            assert.equal(
                result.notifications[0].readAt,
                null
            );
        }
    );

    test(
        "counts unread notifications only for the requested user",
        async () => {

            const userA =
                await createTestUser(
                    "count-a@example.com"
                );

            const userB =
                await createTestUser(
                    "count-b@example.com"
                );

            await createNotification({
                recipientUserId:
                    userA._id.toString(),

                type:
                    "system",

                title:
                    "A",

                message:
                    "A notification.",

                dedupeKey:
                    `system:count-a:${userA._id}`
            });

            await createNotification({
                recipientUserId:
                    userB._id.toString(),

                type:
                    "system",

                title:
                    "B",

                message:
                    "B notification.",

                dedupeKey:
                    `system:count-b:${userB._id}`
            });

            assert.equal(
                await getUnreadNotificationCount(
                    userA._id
                ),
                1
            );
        }
    );

    test(
        "marks a notification as read only for its owner",
        async () => {

            const owner =
                await createTestUser(
                    "owner@example.com"
                );

            const attacker =
                await createTestUser(
                    "attacker@example.com"
                );

            const notification =
                await createNotification({
                    recipientUserId:
                        owner._id.toString(),

                    type:
                        "system",

                    title:
                        "Private",

                    message:
                        "Private notification.",

                    dedupeKey:
                        `system:private:${owner._id}`
                });

            const unauthorized =
                await markNotificationRead(
                    attacker._id,
                    notification.notificationId
                );

            assert.equal(
                unauthorized,
                null
            );

            const unchanged =
                await Notification.findOne({
                    notificationId:
                        notification.notificationId
                });

            assert.equal(
                unchanged.readAt,
                null
            );

            const authorized =
                await markNotificationRead(
                    owner._id,
                    notification.notificationId
                );

            assert.ok(
                authorized.readAt instanceof Date
            );
        }
    );

    test(
        "mark-all only affects the authenticated user's notifications",
        async () => {

            const userA =
                await createTestUser(
                    "all-a@example.com"
                );

            const userB =
                await createTestUser(
                    "all-b@example.com"
                );

            await createNotification({
                recipientUserId:
                    userA._id.toString(),

                type:
                    "system",

                title:
                    "A1",

                message:
                    "A1.",

                dedupeKey:
                    `system:a1:${userA._id}`
            });

            await createNotification({
                recipientUserId:
                    userA._id.toString(),

                type:
                    "system",

                title:
                    "A2",

                message:
                    "A2.",

                dedupeKey:
                    `system:a2:${userA._id}`
            });

            await createNotification({
                recipientUserId:
                    userB._id.toString(),

                type:
                    "system",

                title:
                    "B1",

                message:
                    "B1.",

                dedupeKey:
                    `system:b1:${userB._id}`
            });

            const result =
                await markAllNotificationsRead(
                    userA._id
                );

            assert.equal(
                result.modifiedCount,
                2
            );

            assert.equal(
                await getUnreadNotificationCount(
                    userA._id
                ),
                0
            );

            assert.equal(
                await getUnreadNotificationCount(
                    userB._id
                ),
                1
            );
        }
    );
});