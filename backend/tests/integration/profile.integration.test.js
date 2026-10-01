"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

import {
    loginRateLimiter
} from "../../src/middleware/authRateLimiters.js";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: {
        count: 1
    }
});

process.env.MONGODB_URI =
    mongoServer.getUri("streamflix_profile_test");

const { app } =
    await import("../../src/server.js");

const {
    connectDatabase,
    disconnectDatabase
} = await import("../../src/config/database.js");

const User =
    (await import("../../src/models/User.js")).default;

const Profile =
    (await import("../../src/models/Profile.js")).default;

const {
    hashPassword
} =
    await import("../../src/services/authService.js");

await connectDatabase();

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


/*==================================================
    Authentication Boundary
==================================================*/

test(
    "GET /api/profile rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .get("/api/profile");

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
    "PATCH /api/profile rejects unauthenticated requests",
    async () => {

        const response =
            await request(app)
                .patch("/api/profile")
                .send({
                    displayName:
                        "Unauthenticated User"
                });

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
    Profile Ownership
==================================================*/

test(
    "GET /api/profile creates and returns the authenticated user's profile",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-get-integration@example.com"
            );

        const response =
            await request(app)
                .get("/api/profile")
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

        assert.ok(
            response.body.data.profile
        );

        const profile =
            response.body.data.profile;

        assert.equal(
            profile.userId,
            user._id.toString()
        );

        assert.equal(
            profile.displayName,
            null
        );

        assert.equal(
            profile.firstName,
            null
        );

        assert.equal(
            profile.lastName,
            null
        );

        assert.equal(
            profile.bio,
            null
        );

        assert.equal(
            profile.avatarUrl,
            null
        );

        const storedProfile =
            await Profile.findOne({
                userId: user._id
            });

        assert.ok(
            storedProfile
        );

        assert.equal(
            storedProfile.userId.toString(),
            user._id.toString()
        );

    }
);


test(
    "PATCH /api/profile updates only the authenticated user's profile",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-update-integration@example.com"
            );

        const response =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "Godfrey",
                    firstName:
                        "Godfrey",
                    lastName:
                        "Emmanuel",
                    bio:
                        "Frontend developer building full-stack applications.",
                    avatarUrl:
                        "https://example.com/avatar.png"
                });

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
            "Profile updated successfully."
        );

        const profile =
            response.body.data.profile;

        assert.equal(
            profile.userId,
            user._id.toString()
        );

        assert.equal(
            profile.displayName,
            "Godfrey"
        );

        assert.equal(
            profile.firstName,
            "Godfrey"
        );

        assert.equal(
            profile.lastName,
            "Emmanuel"
        );

        assert.equal(
            profile.bio,
            "Frontend developer building full-stack applications."
        );

        assert.equal(
            profile.avatarUrl,
            "https://example.com/avatar.png"
        );

        const storedProfile =
            await Profile.findOne({
                userId: user._id
            });

        assert.ok(
            storedProfile
        );

        assert.equal(
            storedProfile.displayName,
            "Godfrey"
        );

    }
);


/*==================================================
    Validation Boundary
==================================================*/

test(
    "PATCH /api/profile rejects client-supplied userId",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-userid-injection@example.com"
            );

        const response =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "Attempted Injection",
                    userId:
                        new mongoose.Types.ObjectId().toString()
                });

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
            "Invalid profile data."
        );

    }
);


test(
    "PATCH /api/profile rejects unsupported account fields",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-account-fields@example.com"
            );

        const response =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "Profile User",
                    role:
                        "admin",
                    status:
                        "active",
                    emailVerified:
                        true
                });

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
            "Invalid profile data."
        );

    }
);


/*==================================================
    Cross-User Isolation
==================================================*/

test(
    "Each authenticated user receives only their own profile",
    async () => {

        const firstUser =
            await createAuthenticatedUser(
                "profile-owner-a@example.com"
            );

        const secondUser =
            await createAuthenticatedUser(
                "profile-owner-b@example.com"
            );

        const firstUpdate =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${firstUser.accessToken}`
                )
                .send({
                    displayName:
                        "User A"
                });

        assert.equal(
            firstUpdate.status,
            200
        );

        const secondProfile =
            await request(app)
                .get("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${secondUser.accessToken}`
                );

        assert.equal(
            secondProfile.status,
            200
        );

        assert.equal(
            secondProfile.body.success,
            true
        );

        assert.equal(
            secondProfile.body.data.profile.userId,
            secondUser.user._id.toString()
        );

        assert.equal(
            secondProfile.body.data.profile.displayName,
            null
        );

        const firstStoredProfile =
            await Profile.findOne({
                userId:
                    firstUser.user._id
            });

        const secondStoredProfile =
            await Profile.findOne({
                userId:
                    secondUser.user._id
            });

        assert.ok(
            firstStoredProfile
        );

        assert.ok(
            secondStoredProfile
        );

        assert.equal(
            firstStoredProfile.displayName,
            "User A"
        );

        assert.equal(
            secondStoredProfile.displayName,
            null
        );

        assert.notEqual(
            firstStoredProfile.userId.toString(),
            secondStoredProfile.userId.toString()
        );

    }
);


/*==================================================
    One Profile Per User
==================================================*/

test(
    "A user receives exactly one profile",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-singleton-integration@example.com"
            );

        const firstResponse =
            await request(app)
                .get("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            firstResponse.status,
            200
        );

        const secondResponse =
            await request(app)
                .get("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            secondResponse.status,
            200
        );

        const profiles =
            await Profile.find({
                userId: user._id
            });

        assert.equal(
            profiles.length,
            1
        );

        assert.equal(
            firstResponse.body.data.profile.userId,
            user._id.toString()
        );

        assert.equal(
            secondResponse.body.data.profile.userId,
            user._id.toString()
        );

    }
);



/*==================================================
    Edge Cases
==================================================*/

test(
    "PATCH /api/profile accepts maximum allowed field lengths",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-max-length@example.com"
            );

               const response =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "D".repeat(100),
                    firstName:
                        "F".repeat(100),
                    lastName:
                        "L".repeat(100),
                    bio:
                        "B".repeat(500),
                    avatarUrl:
                        `https://example.com/${"a".repeat(2028)}`
                });

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.data.profile.displayName.length,
            100
        );
        assert.equal(
            response.body.data.profile.firstName.length,
            100
        );

        assert.equal(
            response.body.data.profile.lastName.length,
            100
        );

        assert.equal(
            response.body.data.profile.bio.length,
            500
        );

        assert.equal(
            response.body.data.profile.avatarUrl.length,
            2048
        );

    }
);


test(
    "PATCH /api/profile rejects fields exceeding maximum lengths",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-over-length@example.com"
            );

        const response =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "D".repeat(101)
                });

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
            "Invalid profile data."
        );

    }
);


test(
    "PATCH /api/profile accepts explicit null values",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-null-values@example.com"
            );

        const updateResponse =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "Temporary Name",
                    bio:
                        "Temporary biography."
                });

        assert.equal(
            updateResponse.status,
            200
        );

        const clearResponse =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        null,
                    bio:
                        null
                });

        assert.equal(
            clearResponse.status,
            200
        );

        assert.equal(
            clearResponse.body.data.profile.displayName,
            null
        );

        assert.equal(
            clearResponse.body.data.profile.bio,
            null
        );

    }
);


test(
    "PATCH /api/profile with an empty object does not modify the profile",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-empty-update@example.com"
            );

        const initialResponse =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({
                    displayName:
                        "Existing Name"
                });

        assert.equal(
            initialResponse.status,
            200
        );

        const emptyResponse =
            await request(app)
                .patch("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                )
                .send({});

        assert.equal(
            emptyResponse.status,
            200
        );

        assert.equal(
            emptyResponse.body.data.profile.displayName,
            "Existing Name"
        );

    }
);


test(
    "Profile response does not expose unexpected account-security fields",
    async () => {

        const {
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-response-security@example.com"
            );

        const response =
            await request(app)
                .get("/api/profile")
                .set(
                    "Authorization",
                    `Bearer ${accessToken}`
                );

        assert.equal(
            response.status,
            200
        );

        const profile =
            response.body.data.profile;

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                profile,
                "passwordHash"
            ),
            false
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                profile,
                "role"
            ),
            false
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                profile,
                "status"
            ),
            false
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                profile,
                "emailVerified"
            ),
            false
        );

    }
);
test(
    "Concurrent first-time profile requests create exactly one profile",
    async () => {

        const {
            user,
            accessToken
        } =
            await createAuthenticatedUser(
                "profile-concurrent@example.com"
            );

        const authorization =
            `Bearer ${accessToken}`;

        const [
            firstResponse,
            secondResponse
        ] =
            await Promise.all([
                request(app)
                    .get("/api/profile")
                    .set(
                        "Authorization",
                        authorization
                    ),

                request(app)
                    .get("/api/profile")
                    .set(
                        "Authorization",
                        authorization
                    )
            ]);

        assert.equal(
            firstResponse.status,
            200
        );

        assert.equal(
            secondResponse.status,
            200
        );

        assert.equal(
            firstResponse.body.success,
            true
        );

        assert.equal(
            secondResponse.body.success,
            true
        );

        assert.equal(
            firstResponse.body.data.profile.userId,
            user._id.toString()
        );

        assert.equal(
            secondResponse.body.data.profile.userId,
            user._id.toString()
        );

        assert.equal(
            firstResponse.body.data.profile._id,
            secondResponse.body.data.profile._id
        );

        const profileCount =
            await Profile.countDocuments({
                userId: user._id
            });

        assert.equal(
            profileCount,
            1
        );

    }
);