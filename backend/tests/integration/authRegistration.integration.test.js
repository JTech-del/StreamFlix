"use strict";

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Resend } from "resend";
import request from "supertest";

const mongoServer = await MongoMemoryServer.create();

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
