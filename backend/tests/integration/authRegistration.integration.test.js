"use strict";

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Resend } from "resend";
import request from "supertest";

const mongoServer = await MongoMemoryReplSet.create({
    replSet: {
        count: 1
    }
});

process.env.MONGODB_URI = mongoServer.getUri("streamflix_test");

const resendEmailsPrototype = Object.getPrototypeOf(
    new Resend("integration-test-key").emails
);

const resendSendMock = mock.method(
    resendEmailsPrototype,
    "send",
    async () => ({
        data: {
            id: "integration-test-email-id"
        },
        error: null
    })
);

const { app } = await import("../../src/server.js");
const { connectDatabase, disconnectDatabase } =
    await import("../../src/config/database.js");

const User = (await import("../../src/models/User.js")).default;
const VerificationToken =
    (await import("../../src/models/VerificationToken.js")).default;

await connectDatabase();

test.after(async () => {
    resendSendMock.mock.restore();

    await mongoose.connection.dropDatabase();
    await disconnectDatabase();

    await mongoServer.stop();
});

test("POST /api/auth/register creates a user and sends verification email", async () => {
    const response = await request(app)
        .post("/api/auth/register")
        .set("content-type", "application/json")
        .send({
            email: "integration@example.com",
            password: "StrongPassword123!"
        });
        assert.equal(response.status, 201);

    const body = response.body;

    assert.equal(body.success, true);
    assert.equal(
        body.message,
        "Account created successfully."
    );

    assert.ok(body.data);
    assert.equal(
        body.data.email,
        "integration@example.com"
    );
    assert.equal(body.data.role, "user");
    assert.equal(body.data.status, "active");
    assert.equal(body.data.emailVerified, false);
    assert.equal(
        Object.hasOwn(body.data, "passwordHash"),
        false
    );

    const user = await User.findOne({
        email: "integration@example.com"
    }).select("+passwordHash");

    assert.ok(user);
    assert.equal(user.emailVerified, false);
    assert.ok(user.passwordHash);

    const verificationToken =
        await VerificationToken.findOne({
            userId: user._id,
            purpose: "email_verification"
        });

    assert.ok(verificationToken);
    assert.equal(verificationToken.usedAt, null);
    assert.equal(verificationToken.revokedAt, null);
    assert.ok(verificationToken.expiresAt > new Date());

    assert.equal(resendSendMock.mock.callCount(), 1);

    const emailPayload =
        resendSendMock.mock.calls[0].arguments[0];

    assert.deepEqual(
        emailPayload.to,
        ["integration@example.com"]
    );
    assert.equal(
        emailPayload.subject,
        "Verify your StreamFlix email address"
    );
    assert.match(
        emailPayload.text,
        /verify/i
    );
});








test(
    "POST /api/auth/forgot-password creates a reset token and sends password reset email",
    async () => {
        const email = "forgot-password@example.com";

        await User.create({
            email,
            passwordHash: "integration-test-password-hash",
            role: "user",
            status: "active",
            emailVerified: true
        });

        const response =
            await request(app)
                .post("/api/auth/forgot-password")
                .set("content-type", "application/json")
                .send({
                    email
                });

        assert.equal(response.status, 200);

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.message,
            "If an account with that email exists, a password reset link has been sent."
        );

        const user =
            await User.findOne({
                email
            });

        assert.ok(user);

        const resetToken =
            await VerificationToken.findOne({
                userId: user._id,
                purpose: "password_reset"
            });

        assert.ok(resetToken);

        assert.equal(
            resetToken.usedAt,
            null
        );

        assert.equal(
            resetToken.revokedAt,
            null
        );

        assert.ok(
            resetToken.expiresAt > new Date()
        );

        assert.equal(
            resendSendMock.mock.callCount(),
            2
        );

        const emailPayload =
            resendSendMock.mock.calls[1].arguments[0];

        assert.deepEqual(
            emailPayload.to,
            [email]
        );

        assert.equal(
            emailPayload.subject,
            "Reset your StreamFlix password"
        );

        assert.match(
            emailPayload.text,
            /reset/i
        );
    }
);

const { createVerificationToken } =
    await import("../../src/services/verificationTokenService.js");

test(
    "GET /api/auth/verify-email verifies the user and consumes the verification token",
    async () => {
        const email = "verify-integration@example.com";

        const user = await User.create({
            email,
            passwordHash: "integration-test-password-hash",
            role: "user",
            status: "active",
            emailVerified: false
        });

        const { token } =
            await createVerificationToken(
                user._id,
                "email_verification"
            );

        const response =
            await request(app)
                .get("/api/auth/verify-email")
                .query({ token });

        assert.equal(response.status, 200);

        assert.equal(
            response.body.success,
            true
        );

        assert.equal(
            response.body.message,
            "Email verified successfully."
        );

        const verifiedUser =
            await User.findById(user._id);

        assert.ok(verifiedUser);
        assert.equal(
            verifiedUser.emailVerified,
            true
        );

        const consumedToken =
            await VerificationToken.findOne({
                userId: user._id,
                purpose: "email_verification"
            });

        assert.ok(consumedToken);
        assert.ok(consumedToken.usedAt);
        assert.equal(
            consumedToken.revokedAt,
            null
        );
    }
);

const Session =
    (await import("../../src/models/Session.js")).default;

test(
    "POST /api/auth/login authenticates a verified user and creates a session",
    async () => {
        const email = "login-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } =
            await import("../../src/services/authService.js");

        const passwordHash =
            await hashPassword(password);

        const user = await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const response =
            await request(app)
                .post("/api/auth/login")
                .send({
                    email,
                    password
                });

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);

        assert.equal(
            typeof response.body.data.accessToken,
            "string"
        );

        assert.equal(
            typeof response.body.data.refreshToken,
            "string"
        );

        assert.equal(
            typeof response.body.data.sessionId,
            "string"
        );

        assert.equal(
            response.body.data.user.email,
            email
        );

        assert.equal(
            response.body.data.user.role,
            "user"
        );

        assert.equal(
            response.body.data.user.status,
            "active"
        );

        assert.equal(
            response.body.data.user.emailVerified,
            true
        );

        assert.equal(
            response.body.data.user.passwordHash,
            undefined
        );

        assert.equal(
            response.body.data.sessionId.length > 0,
            true
        );

        const session =
            await Session.findOne({
                sessionId:
                    response.body.data.sessionId
            }).select("+refreshTokenHash");

        assert.ok(session);

        assert.equal(
            session.userId.toString(),
            user._id.toString()
        );

        assert.ok(session.refreshTokenHash);

        assert.notEqual(
            session.refreshTokenHash,
            response.body.data.refreshToken
        );

        assert.equal(
            session.revokedAt,
            null
        );

        assert.ok(session.expiresAt);
        assert.ok(session.lastUsedAt);

        const loggedInUser =
            await User.findById(user._id);

        assert.ok(loggedInUser);
        assert.ok(loggedInUser.lastLoginAt);
    }
);

test(
    "POST /api/auth/refresh rotates the refresh token and invalidates the previous token",
    async () => {
        const email = "refresh-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } =
            await import("../../src/services/authService.js");

        const passwordHash =
            await hashPassword(password);

        const user = await User.create({
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

        assert.equal(loginResponse.status, 200);
        assert.equal(loginResponse.body.success, true);

        const oldRefreshToken =
            loginResponse.body.data.refreshToken;

        const sessionId =
            loginResponse.body.data.sessionId;

        const refreshResponse =
            await request(app)
                .post("/api/auth/refresh")
                .send({
                    refreshToken: oldRefreshToken
                });

        assert.equal(refreshResponse.status, 200);
        assert.equal(refreshResponse.body.success, true);

        assert.equal(
            typeof refreshResponse.body.data.accessToken,
            "string"
        );

        assert.equal(
            typeof refreshResponse.body.data.refreshToken,
            "string"
        );

        assert.equal(
            refreshResponse.body.data.sessionId,
            sessionId
        );

        const newRefreshToken =
            refreshResponse.body.data.refreshToken;

        assert.notEqual(
            newRefreshToken,
            oldRefreshToken
        );

        const session =
            await Session.findOne({
                sessionId
            }).select("+refreshTokenHash");

        assert.ok(session);
        assert.equal(
            session.userId.toString(),
            user._id.toString()
        );
        assert.equal(
            session.revokedAt,
            null
        );

        const oldTokenResponse =
            await request(app)
                .post("/api/auth/refresh")
                .send({
                    refreshToken: oldRefreshToken
                });

        assert.equal(
            oldTokenResponse.status,
            401
        );

        assert.equal(
            oldTokenResponse.body.success,
            false
        );
    }
);

test(
    "POST /api/auth/logout revokes the authenticated refresh session",
    async () => {
        const email = "logout-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } =
            await import("../../src/services/authService.js");

        const passwordHash =
            await hashPassword(password);

        const user = await User.create({
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

        assert.equal(loginResponse.status, 200);
        assert.equal(loginResponse.body.success, true);

        const refreshToken =
            loginResponse.body.data.refreshToken;

        const sessionId =
            loginResponse.body.data.sessionId;

        const logoutResponse =
            await request(app)
                .post("/api/auth/logout")
                .send({
                    refreshToken
                });

        assert.equal(logoutResponse.status, 200);
        assert.equal(logoutResponse.body.success, true);

        const session =
            await Session.findOne({
                sessionId
            });

        assert.ok(session);

        assert.equal(
            session.userId.toString(),
            user._id.toString()
        );

        assert.ok(session.revokedAt);

        assert.equal(
            session.revocationReason,
            "logout"
        );

        const refreshAfterLogout =
            await request(app)
                .post("/api/auth/refresh")
                .send({
                    refreshToken
                });

        assert.equal(
            refreshAfterLogout.status,
            401
        );

        assert.equal(
            refreshAfterLogout.body.success,
            false
        );
    }
);



test(
    "POST /api/auth/reset-password resets the password and revokes existing sessions",
    async () => {
        const email = "reset-password-integration@example.com";
        const oldPassword = "StrongPassword123!";
        const newPassword = "NewStrongPassword456!";

        const {
            hashPassword,
            verifyPassword
        } = await import(
            "../../src/services/authService.js"
        );

        const {
            createVerificationToken
        } = await import(
            "../../src/services/verificationTokenService.js"
        );

        const passwordHash =
            await hashPassword(oldPassword);

        const user = await User.create({
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
                    password: oldPassword
                });

        assert.equal(
            loginResponse.status,
            200
        );

        assert.equal(
            loginResponse.body.success,
            true
        );

        const refreshToken =
            loginResponse.body.data.refreshToken;

        const sessionId =
            loginResponse.body.data.sessionId;

        const {
            token: resetToken
        } = await createVerificationToken(
            user._id,
            "password_reset"
        );

        const resetResponse =
            await request(app)
                .post("/api/auth/reset-password")
                .send({
                    token: resetToken,
                    newPassword
                });

        assert.equal(
            resetResponse.status,
            200
        );

        assert.equal(
            resetResponse.body.success,
            true
        );

        assert.equal(
            resetResponse.body.message,
            "Password reset successfully."
        );

        const updatedUser =
            await User.findById(user._id)
                .select("+passwordHash");

        assert.ok(updatedUser);

        assert.equal(
            await verifyPassword(
                newPassword,
                updatedUser.passwordHash
            ),
            true
        );

        assert.equal(
            await verifyPassword(
                oldPassword,
                updatedUser.passwordHash
            ),
            false
        );

        const session =
            await Session.findOne({
                sessionId
            });

        assert.ok(session);

        assert.ok(
            session.revokedAt
        );

        assert.equal(
            session.revocationReason,
            "password_reset"
        );

        const refreshAfterReset =
            await request(app)
                .post("/api/auth/refresh")
                .send({
                    refreshToken
                });

        assert.equal(
            refreshAfterReset.status,
            401
        );

        assert.equal(
            refreshAfterReset.body.success,
            false
        );
    }
);

test(
    "GET /api/sessions returns the authenticated user's active sessions",
    async () => {
        const email = "sessions-list-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } = await import("../../src/services/authService.js");
        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;
        const sessionId = loginResponse.body.data.sessionId;

        const response = await request(app)
            .get("/api/sessions/")
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.sessions.length, 1);

        const session = response.body.data.sessions[0];

        assert.equal(session.sessionId, sessionId);
        assert.equal(session.isCurrent, true);
        assert.equal(session.device, null);
        assert.equal(session.ipAddress, "::ffff:127.0.0.1");
        assert.equal(session.userAgent, null);

        assert.ok(session.createdAt);
        assert.ok(session.lastUsedAt);
        assert.ok(session.expiresAt);

        assert.equal("refreshTokenHash" in session, false);
        assert.equal("passwordHash" in session, false);
    }
);

test(
    "POST /api/sessions/logout-others revokes all other active sessions",
    async () => {
        const email = "logout-others-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } = await import("../../src/services/authService.js");
        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const firstLogin = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(firstLogin.status, 200);

        const firstAccessToken = firstLogin.body.data.accessToken;
        const firstSessionId = firstLogin.body.data.sessionId;

        const secondLogin = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(secondLogin.status, 200);

        const secondRefreshToken = secondLogin.body.data.refreshToken;
        const secondSessionId = secondLogin.body.data.sessionId;

        assert.notEqual(firstSessionId, secondSessionId);

        const logoutOthersResponse = await request(app)
            .post("/api/sessions/logout-others")
            .set("Authorization", `Bearer ${firstAccessToken}`);

        assert.equal(logoutOthersResponse.status, 200);
        assert.equal(logoutOthersResponse.body.success, true);
        assert.equal(logoutOthersResponse.body.data.revokedCount, 1);

        const firstSession = await Session.findOne({ sessionId: firstSessionId });
        const secondSession = await Session.findOne({ sessionId: secondSessionId });

        assert.equal(firstSession.revokedAt, null);
        assert.equal(secondSession.revocationReason, "logout_others");
        assert.ok(secondSession.revokedAt);

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken: secondRefreshToken });

        assert.equal(refreshResponse.status, 401);
        assert.equal(refreshResponse.body.success, false);
    }
);

test(
    "DELETE /api/sessions/:sessionId revokes the authenticated user's own session",
    async () => {
        const email = "session-revoke-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } = await import("../../src/services/authService.js");
        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;
        const refreshToken = loginResponse.body.data.refreshToken;
        const sessionId = loginResponse.body.data.sessionId;

        const revokeResponse = await request(app)
            .delete(`/api/sessions/${sessionId}`)
            .set("Authorization", `Bearer ${accessToken}`);

        assert.equal(revokeResponse.status, 200);
        assert.equal(revokeResponse.body.success, true);
        assert.equal(
            revokeResponse.body.message,
            "Session revoked successfully."
        );

        const session = await Session.findOne({ sessionId });

        assert.ok(session);
        assert.ok(session.revokedAt);
        assert.equal(session.revocationReason, "user_revoked");

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken });

        assert.equal(refreshResponse.status, 401);
        assert.equal(refreshResponse.body.success, false);
    }
);

test(
    "DELETE /api/sessions/:sessionId cannot revoke another user's session",
    async () => {
        const password = "StrongPassword123!";

        const { hashPassword } = await import("../../src/services/authService.js");
        const passwordHash = await hashPassword(password);

        const userA = await User.create({
            email: "session-isolation-a@example.com",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const userB = await User.create({
            email: "session-isolation-b@example.com",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const loginA = await request(app)
            .post("/api/auth/login")
            .send({
                email: userA.email,
                password
            });

        assert.equal(loginA.status, 200);

        const accessTokenA = loginA.body.data.accessToken;

        const loginB = await request(app)
            .post("/api/auth/login")
            .send({
                email: userB.email,
                password
            });

        assert.equal(loginB.status, 200);

        const sessionIdB = loginB.body.data.sessionId;
        const refreshTokenB = loginB.body.data.refreshToken;

        const revokeResponse = await request(app)
            .delete(`/api/sessions/${sessionIdB}`)
            .set("Authorization", `Bearer ${accessTokenA}`);

        assert.equal(revokeResponse.status, 404);
        assert.equal(revokeResponse.body.success, false);
        assert.equal(revokeResponse.body.message, "Session not found.");

        const sessionB = await Session.findOne({
            sessionId: sessionIdB
        });

        assert.ok(sessionB);
        assert.equal(sessionB.revokedAt, null);
        assert.equal(sessionB.revocationReason, null);

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .send({
                refreshToken: refreshTokenB
            });

        assert.equal(refreshResponse.status, 200);
        assert.equal(refreshResponse.body.success, true);
    }
);

test(
    "POST /api/admin/movies/import-tmdb rejects an authenticated non-admin user",
    async () => {
        const email = "rbac-user-integration@example.com";
        const password = "StrongPassword123!";

        const { hashPassword } = await import("../../src/services/authService.js");
        const passwordHash = await hashPassword(password);

        await User.create({
            email,
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        assert.equal(loginResponse.status, 200);

        const accessToken = loginResponse.body.data.accessToken;

        const response = await request(app)
            .post("/api/admin/movies/import-tmdb")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ tmdbId: 550 });

        assert.equal(response.status, 403);
        assert.equal(response.body.success, false);
        assert.equal(response.body.message, "Insufficient permissions.");
    }
);
