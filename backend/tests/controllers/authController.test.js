"use strict";

import test, {
    mock
} from "node:test";

import assert from "node:assert/strict";

import mongoose from "mongoose";

import {
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    login,
    refreshToken,
    logout
} from "../../src/controllers/authController.js";

import User from "../../src/models/User.js";
import Session from "../../src/models/Session.js";
import VerificationToken from "../../src/models/VerificationToken.js";

import {
    hashPassword,
    createRefreshToken,
    hashRefreshToken
} from "../../src/services/authService.js";



function createResponse() {

    return {

        statusCode: null,

        body: null,

        status(code) {

            this.statusCode = code;

            return this;

        },

        json(payload) {

            this.body = payload;

            return this;

        }

    };

}


function createRequest(
    body = {}
) {

    return {

        body,

        headers: {
            "user-agent": "node-test-agent"
        },

        ip: "127.0.0.1"

    };

}


function createUser(
    overrides = {}
) {

    return {

        _id: "login-user-123",

        email: "login@example.com",

        passwordHash:
            "placeholder",

        role: "user",

        status: "active",

        emailVerified: true,

        createdAt: new Date(),

        lastLoginAt: null,

        save: mock.fn(
            async function save() {
                return this;
            }
        ),

        ...overrides

    };

}

function mockVerificationTransaction() {

    const session = {
        withTransaction: mock.fn(
            async callback => {
                return callback();
            }
        ),

        endSession: mock.fn(
            async () => {}
        )
    };

    mock.method(
        mongoose,
        "startSession",
        async () => session
    );

    return session;
}


test(
    "login rejects invalid request data",
    async () => {

        const req =
            createRequest({
                email: "not-an-email"
            });

        const res =
            createResponse();

        await login(
            req,
            res
        );

        assert.equal(
            res.statusCode,
            400
        );

        assert.equal(
            res.body.success,
            false
        );

        assert.equal(
            res.body.message,
            "Invalid login data."
        );

    }
);


test(
    "login rejects an unknown email with a generic authentication failure",
    async () => {

        const findOne =
            mock.method(
                User,
                "findOne",
                () => ({
                    select: async () => null
                })
            );

        try {

            const req =
                createRequest({
                    email:
                        "unknown@example.com",
                    password:
                        "Password123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid email or password."
                }
            );

            assert.equal(
                findOne.mock.calls.length,
                1
            );

            assert.deepEqual(
                findOne.mock.calls[0].arguments,
                [{
                    email:
                        "unknown@example.com"
                }]
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login rejects an incorrect password",
    async () => {

        const passwordHash =
            await hashPassword(
                "CorrectPassword123!"
            );

        const user =
            createUser({
                passwordHash
            });

        const findOne =
            mock.method(
                User,
                "findOne",
                () => ({
                    select:
                        async () => user
                })
            );

        try {

            const req =
                createRequest({
                    email:
                        user.email,
                    password:
                        "WrongPassword123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid email or password."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login rejects a suspended account",
    async () => {

        const passwordHash =
            await hashPassword(
                "CorrectPassword123!"
            );

        const user =
            createUser({
                passwordHash,
                status: "suspended"
            });

        mock.method(
            User,
            "findOne",
            () => ({
                select:
                    async () => user
            })
        );

        try {

            const req =
                createRequest({
                    email:
                        user.email,
                    password:
                        "CorrectPassword123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                403
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "This account is not available."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login rejects a disabled account",
    async () => {

        const passwordHash =
            await hashPassword(
                "CorrectPassword123!"
            );

        const user =
            createUser({
                passwordHash,
                status: "disabled"
            });

        mock.method(
            User,
            "findOne",
            () => ({
                select:
                    async () => user
            })
        );

        try {

            const req =
                createRequest({
                    email:
                        user.email,
                    password:
                        "CorrectPassword123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                403
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "This account is not available."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login rejects a user whose email is not verified",
    async () => {

        const passwordHash =
            await hashPassword(
                "CorrectPassword123!"
            );

        const user =
            createUser({
                passwordHash,
                emailVerified: false
            });

        mock.method(
            User,
            "findOne",
            () => ({
                select:
                    async () => user
            })
        );

        try {

            const req =
                createRequest({
                    email:
                        user.email,
                    password:
                        "CorrectPassword123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                403
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Please verify your email address before logging in."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login creates a session and returns tokens for a valid verified user",
    async () => {

        const password =
            "CorrectPassword123!";

        const passwordHash =
            await hashPassword(
                password
            );

        const user =
            createUser({
                passwordHash
            });

        const findOne =
            mock.method(
                User,
                "findOne",
                () => ({
                    select:
                        async () => user
                })
            );

        const sessionCreate =
            mock.method(
                Session,
                "create",
                async document => ({
                    ...document
                })
            );

        try {

            const req =
                createRequest({
                    email:
                        user.email,
                    password
                });

            req.headers["sec-ch-ua"] =
                '"Chromium";v="140"';

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                200
            );

            assert.equal(
                res.body.success,
                true
            );

            assert.equal(
                res.body.message,
                "Login successful."
            );

            assert.equal(
                typeof res.body.data.accessToken,
                "string"
            );

            assert.ok(
                res.body.data.accessToken.length > 0
            );

            assert.equal(
                typeof res.body.data.refreshToken,
                "string"
            );

            assert.ok(
                res.body.data.refreshToken.length > 0
            );

            assert.equal(
                typeof res.body.data.sessionId,
                "string"
            );

            assert.equal(
                res.body.data.user.id,
                user._id
            );

            assert.equal(
                res.body.data.user.email,
                user.email
            );

            assert.equal(
                res.body.data.user.role,
                user.role
            );

            assert.equal(
                res.body.data.user.status,
                user.status
            );

            assert.equal(
                res.body.data.user.emailVerified,
                true
            );

            assert.equal(
                findOne.mock.calls.length,
                1
            );

            assert.equal(
                sessionCreate.mock.calls.length,
                1
            );

            const sessionDocument =
                sessionCreate.mock.calls[0]
                    .arguments[0];

            assert.equal(
                sessionDocument.userId,
                user._id
            );

            assert.equal(
                sessionDocument.device,
                '"Chromium";v="140"'
            );

            assert.equal(
                sessionDocument.ipAddress,
                "127.0.0.1"
            );

            assert.equal(
                sessionDocument.userAgent,
                "node-test-agent"
            );

            assert.equal(
                typeof sessionDocument.refreshTokenHash,
                "string"
            );

            assert.ok(
                sessionDocument.refreshTokenHash.length > 0
            );

            assert.equal(
                typeof sessionDocument.sessionId,
                "string"
            );

            assert.ok(
                sessionDocument.expiresAt instanceof Date
            );

            assert.ok(
                sessionDocument.lastUsedAt instanceof Date
            );

            assert.ok(
                user.lastLoginAt instanceof Date
            );

            assert.equal(
                user.save.mock.calls.length,
                1
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "login returns 500 when the authentication lookup fails",
    async () => {

        mock.method(
            User,
            "findOne",
            () => ({
                select: async () => {
                    throw new Error(
                        "database failure"
                    );
                }
            })
        );

        try {

            const req =
                createRequest({
                    email:
                        "login@example.com",
                    password:
                        "CorrectPassword123!"
                });

            const res =
                createResponse();

            await login(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                500
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Failed to login."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);



test(
    "refreshToken rejects invalid request data",
    async () => {

        const req =
            createRequest({});

        const res =
            createResponse();

        await refreshToken(
            req,
            res
        );

        assert.equal(
            res.statusCode,
            400
        );

        assert.equal(
            res.body.success,
            false
        );

        assert.equal(
            res.body.message,
            "Invalid refresh token request."
        );

    }
);


test(
    "refreshToken rejects an invalid refresh JWT",
    async () => {

        const req =
            createRequest({
                refreshToken:
                    "invalid.refresh.token"
            });

        const res =
            createResponse();

        await refreshToken(
            req,
            res
        );

        assert.equal(
            res.statusCode,
            401
        );

        assert.deepEqual(
            res.body,
            {
                success: false,
                message:
                    "Invalid or expired refresh token."
            }
        );

    }
);


test(
    "refreshToken rejects a refresh token when its session no longer exists",
    async () => {

        const user =
            createUser();

        const token =
            createRefreshToken(
                user,
                "missing-session-123"
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => null
            })
        );

        try {

            const req =
                createRequest({
                    refreshToken:
                        token
                });

            const res =
                createResponse();

            await refreshToken(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid or expired refresh token."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "refreshToken rejects a revoked session",
    async () => {

        const user =
            createUser();

        const token =
            createRefreshToken(
                user,
                "revoked-session-123"
            );

        const refreshTokenHash =
            hashRefreshToken(
                token
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: user._id,
                    sessionId:
                        "revoked-session-123",
                    refreshTokenHash,
                    revokedAt:
                        new Date(),
                    expiresAt:
                        new Date(
                            Date.now() + 3600000
                        )
                })
            })
        );

        try {

            const req =
                createRequest({
                    refreshToken:
                        token
                });

            const res =
                createResponse();

            await refreshToken(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid or expired refresh token."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "refreshToken rejects an expired session",
    async () => {

        const user =
            createUser();

        const token =
            createRefreshToken(
                user,
                "expired-session-123"
            );

        const refreshTokenHash =
            hashRefreshToken(
                token
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: user._id,
                    sessionId:
                        "expired-session-123",
                    refreshTokenHash,
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() - 1000
                        )
                })
            })
        );

        try {

            const req =
                createRequest({
                    refreshToken:
                        token
                });

            const res =
                createResponse();

            await refreshToken(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid or expired refresh token."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "refreshToken rejects a session owned by a different user",
    async () => {

        const tokenUser =
            createUser({
                _id:
                    "refresh-token-user-123"
            });

        const token =
            createRefreshToken(
                tokenUser,
                "ownership-session-123"
            );

        const refreshTokenHash =
            hashRefreshToken(
                token
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId:
                        "different-user-456",
                    sessionId:
                        "ownership-session-123",
                    refreshTokenHash,
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 3600000
                        )
                })
            })
        );

        try {

            const req =
                createRequest({
                    refreshToken:
                        token
                });

            const res =
                createResponse();

            await refreshToken(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid refresh token."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);


test(
    "refreshToken rejects a token when its stored hash does not match",
    async () => {

        const user =
            createUser();

        const token =
            createRefreshToken(
                user,
                "hash-mismatch-session"
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: user._id,
                    sessionId:
                        "hash-mismatch-session",
                    refreshTokenHash:
                        hashRefreshToken(
                            "different-token"
                        ),
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 3600000
                        )
                })
            })
        );

        try {

            const req =
                createRequest({
                    refreshToken:
                        token
                });

            const res =
                createResponse();

            await refreshToken(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid refresh token."
                }
            );

        } finally {

            mock.restoreAll();

        }

    }
);

test(
    "refreshToken rejects the request when the session user no longer exists",
    async () => {
        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: "refresh-user-missing",
                    refreshTokenHash: hashRefreshToken("valid-refresh-token"),
                    revokedAt: null,
                    expiresAt: new Date(Date.now() + 60_000)
                })
            })
        );

        mock.method(
            User,
            "findById",
            async () => null
        );

        const user = {
            _id: "refresh-user-missing"
        };

        const token =
            createRefreshToken(
                user,
                "refresh-session-missing-user"
            );

        const req =
            createRequest({
                refreshToken: token
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(res.statusCode, 401);
            assert.deepEqual(res.body, {
                success: false,
                message: "Invalid refresh token."
            });
        } finally {
            mock.restoreAll();
        }
    }
);


test(
    "refreshToken rejects a suspended account",
    async () => {
        const user = {
            _id: "refresh-suspended-user",
            role: "user",
            status: "suspended"
        };

        const token =
            createRefreshToken(
                user,
                "refresh-session-suspended"
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: user._id,
                    refreshTokenHash:
                        hashRefreshToken(token),
                    revokedAt: null,
                    expiresAt:
                        new Date(Date.now() + 60_000)
                })
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        const req =
            createRequest({
                refreshToken: token
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(res.statusCode, 403);
            assert.deepEqual(res.body, {
                success: false,
                message: "This account is not available."
            });
        } finally {
            mock.restoreAll();
        }
    }
);


test(
    "refreshToken rejects a disabled account",
    async () => {
        const user = {
            _id: "refresh-disabled-user",
            role: "user",
            status: "disabled"
        };

        const token =
            createRefreshToken(
                user,
                "refresh-session-disabled"
            );

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => ({
                    userId: user._id,
                    refreshTokenHash:
                        hashRefreshToken(token),
                    revokedAt: null,
                    expiresAt:
                        new Date(Date.now() + 60_000)
                })
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        const req =
            createRequest({
                refreshToken: token
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(res.statusCode, 403);
            assert.deepEqual(res.body, {
                success: false,
                message: "This account is not available."
            });
        } finally {
            mock.restoreAll();
        }
    }
);


test(
    "refreshToken rotates the refresh token and returns a new access token",
    async () => {
        const user = {
            _id: "refresh-success-user",
            role: "user",
            status: "active"
        };

        const oldToken =
            createRefreshToken(
                user,
                "refresh-session-success"
            );

        const oldHash =
            hashRefreshToken(oldToken);

   const session = {
    userId: user._id,
    refreshTokenHash: oldHash,
    sessionId: "refresh-session-success",
    revokedAt: null,
    expiresAt:
        new Date(Date.now() + 60_000),
    absoluteExpiresAt:
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
};

        let findOneAndUpdateFilter = null;
        let findOneAndUpdateUpdate = null;
        let findOneAndUpdateOptions = null;

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => session
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        mock.method(
            Session,
            "findOneAndUpdate",
            async (
                filter,
                update,
                options
            ) => {
                findOneAndUpdateFilter = filter;
                findOneAndUpdateUpdate = update;
                findOneAndUpdateOptions = options;

                return {
                    ...session,
                    ...update.$set
                };
            }
        );

        const req =
            createRequest({
                refreshToken: oldToken
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(
                res.body.message,
                "Token refreshed successfully."
            );

            assert.equal(
                typeof res.body.data.accessToken,
                "string"
            );

            assert.equal(
                typeof res.body.data.refreshToken,
                "string"
            );

            assert.equal(
                res.body.data.sessionId,
                "refresh-session-success"
            );

            assert.notEqual(
                hashRefreshToken(
                    res.body.data.refreshToken
                ),
                oldHash
            );

            assert.equal(
                findOneAndUpdateUpdate.$set.refreshTokenHash,
                hashRefreshToken(
                    res.body.data.refreshToken
                )
            );

            assert.equal(
                findOneAndUpdateFilter.sessionId,
                "refresh-session-success"
            );

            assert.equal(
                findOneAndUpdateFilter.refreshTokenHash,
                oldHash
            );

            assert.equal(
                findOneAndUpdateFilter.revokedAt,
                null
            );

            assert.ok(
                findOneAndUpdateFilter.expiresAt.$gt instanceof Date
            );

            assert.ok(
    findOneAndUpdateFilter.absoluteExpiresAt.$gt instanceof Date
);

assert.equal(
    findOneAndUpdateUpdate.$set.absoluteExpiresAt,
    undefined
);

            assert.equal(
                findOneAndUpdateUpdate.$set.revokedAt,
                null
            );

            assert.equal(
                findOneAndUpdateUpdate.$set.revocationReason,
                null
            );

            assert.notEqual(
                findOneAndUpdateUpdate.$set.refreshTokenHash,
                oldHash
            );

            assert.ok(
                findOneAndUpdateUpdate.$set.expiresAt instanceof Date
            );

            assert.ok(
                findOneAndUpdateUpdate.$set.lastUsedAt instanceof Date
            );

            assert.deepEqual(
                findOneAndUpdateOptions,
                {
                    returnDocument: "after"
                }
            );
        } finally {
            mock.restoreAll();
        }
    }
);


test(
    "refreshToken caps the new refresh expiry at the absolute session lifetime",
    async () => {
        const user = {
            _id: "refresh-boundary-user",
            role: "user",
            status: "active"
        };

        const oldToken =
            createRefreshToken(
                user,
                "refresh-session-boundary"
            );

        const oldHash =
            hashRefreshToken(oldToken);

        const absoluteExpiresAt =
            new Date(
                Date.now() + 5_000
            );

        const session = {
            userId: user._id,
            refreshTokenHash: oldHash,
            sessionId: "refresh-session-boundary",
            revokedAt: null,
            expiresAt:
                new Date(Date.now() + 60_000),
            absoluteExpiresAt
        };

        let rotatedUpdate = null;

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => session
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        mock.method(
            Session,
            "findOneAndUpdate",
            async (
                filter,
                update
            ) => {
                rotatedUpdate = update;

                return {
                    ...session,
                    ...update.$set
                };
            }
        );

        const req =
            createRequest({
                refreshToken: oldToken
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(
                res.statusCode,
                200
            );

            assert.ok(
                rotatedUpdate.$set.expiresAt instanceof Date
            );

            assert.equal(
                rotatedUpdate.$set.expiresAt.getTime(),
                absoluteExpiresAt.getTime()
            );

            assert.equal(
                rotatedUpdate.$set.absoluteExpiresAt,
                undefined
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "refreshToken rejects a session after its absolute lifetime expires",
    async () => {
        const user = {
            _id: "refresh-expired-absolute-user",
            role: "user",
            status: "active"
        };

        const oldToken =
            createRefreshToken(
                user,
                "refresh-session-expired-absolute"
            );

        const oldHash =
            hashRefreshToken(oldToken);

        const session = {
            userId: user._id,
            refreshTokenHash: oldHash,
            sessionId:
                "refresh-session-expired-absolute",
            revokedAt: null,
            expiresAt:
                new Date(Date.now() + 60_000),
            absoluteExpiresAt:
                new Date(Date.now() - 1_000)
        };

        let rotationAttempted = false;

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => session
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        mock.method(
            Session,
            "findOneAndUpdate",
            async () => {
                rotationAttempted = true;

                return null;
            }
        );

        const req =
            createRequest({
                refreshToken: oldToken
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(
                res.statusCode,
                401
            );

            assert.equal(
                res.body.success,
                false
            );

            assert.equal(
                res.body.message,
                "Invalid or expired refresh token."
            );

            assert.equal(
                rotationAttempted,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "refreshToken rejects refresh-token reuse when atomic rotation loses the race",
    async () => {
        const user = {
            _id: "refresh-replay-user",
            role: "user",
            status: "active"
        };

        const sessionId =
            "refresh-session-replay";

        const oldToken =
            createRefreshToken(
                user,
                sessionId
            );

        const oldHash =
            hashRefreshToken(oldToken);

        const session = {
            userId: user._id,
            refreshTokenHash: oldHash,
            sessionId,
            revokedAt: null,
            expiresAt:
                new Date(Date.now() + 60_000),
            absoluteExpiresAt:
                new Date(
                    Date.now() +
                    30 * 24 * 60 * 60 * 1000
                )
        };

        mock.method(
            Session,
            "findOne",
            () => ({
                select: async () => session
            })
        );

        mock.method(
            User,
            "findById",
            async () => user
        );

        let rotationAttempts = 0;

        mock.method(
            Session,
            "findOneAndUpdate",
            async () => {
                rotationAttempts += 1;

                return null;
            }
        );

        const req =
            createRequest({
                refreshToken: oldToken
            });

        const res = createResponse();

        try {
            await refreshToken(req, res);

            assert.equal(
                rotationAttempts,
                1
            );

            assert.equal(
                res.statusCode,
                401
            );

            assert.equal(
                res.body.success,
                false
            );

            assert.equal(
                res.body.message,
                "Invalid refresh token."
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test("logout rejects invalid request data", async () => {
    const req = createRequest({});
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid logout request.");
});

test("logout rejects an invalid refresh JWT", async () => {
    const req = createRequest({
        refreshToken: "invalid-refresh-token"
    });
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Invalid or expired refresh token."
    );
});

test("logout rejects a refresh token when its session no longer exists", async () => {
    const user = createUser({
        _id: "logout-user-123"
    });

    const sessionId = "logout-session-missing";

    const token = createRefreshToken(
        user,
        sessionId
    );

    mock.method(
        Session,
        "findOne",
        () => ({
            select: async () => null
        })
    );

    const req = createRequest({
        refreshToken: token
    });
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Invalid or expired refresh token."
    );
});

test("logout rejects a refresh token when the stored hash does not match", async () => {
    const user = createUser({
        _id: "logout-user-123"
    });

    const sessionId = "logout-session-hash-mismatch";

    const token = createRefreshToken(
        user,
        sessionId
    );

    const session = {
        userId: user._id,
        refreshTokenHash:
            hashRefreshToken(
                "different-refresh-token"
            ),
        revokedAt: null,
        save: mock.fn(async function save() {
            return this;
        })
    };

    mock.method(
        Session,
        "findOne",
        () => ({
            select: async () => session
        })
    );

    const req = createRequest({
        refreshToken: token
    });
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Invalid refresh token."
    );

    assert.equal(
        session.revokedAt,
        null
    );

    assert.equal(
        session.save.mock.calls.length,
        0
    );
});

test("logout rejects a refresh token when the session belongs to another user", async () => {
    const tokenUser = createUser({
        _id: "logout-token-user"
    });

    const sessionOwner = createUser({
        _id: "logout-session-owner"
    });

    const sessionId = "logout-session-owner-mismatch";

    const token = createRefreshToken(
        tokenUser,
        sessionId
    );

    const session = {
        userId: sessionOwner._id,
        refreshTokenHash:
            hashRefreshToken(token),
        revokedAt: null,
        save: mock.fn(async function save() {
            return this;
        })
    };

    mock.method(
        Session,
        "findOne",
        () => ({
            select: async () => session
        })
    );

    const req = createRequest({
        refreshToken: token
    });
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Invalid refresh token."
    );

    assert.equal(
        session.revokedAt,
        null
    );

    assert.equal(
        session.save.mock.calls.length,
        0
    );
});

test("logout revokes the session and records the logout reason", async () => {
    const user = createUser({
        _id: "logout-success-user"
    });

    const sessionId = "logout-success-session";

    const token = createRefreshToken(
        user,
        sessionId
    );

    const session = {
        userId: user._id,
        refreshTokenHash:
            hashRefreshToken(token),
        revokedAt: null,
        revocationReason: null,
        save: mock.fn(async function save() {
            return this;
        })
    };

    mock.method(
        Session,
        "findOne",
        () => ({
            select: async () => session
        })
    );

    const req = createRequest({
        refreshToken: token
    });
    const res = createResponse();

    await logout(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(
        res.body.message,
        "Logged out successfully."
    );

    assert.ok(
        session.revokedAt instanceof Date
    );

    assert.equal(
        session.revocationReason,
        "logout"
    );

    assert.equal(
        session.save.mock.calls.length,
        1
    );
});



test("register rejects invalid request data", async () => {
    const req = createRequest({
        email: "not-an-email",
        password: "short"
    });

    const res = createResponse();

    await register(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Invalid registration data."
    );
    assert.ok(Array.isArray(res.body.errors));
});

test("register rejects an existing email", async () => {
    const existingUser = {
        _id: "existing-user-123"
    };

    mock.method(
        User,
        "findOne",
        () => ({
            select: async () => existingUser
        })
    );

    const req = createRequest({
        email: "existing@example.com",
        password: "Register-Test-789!"
    });

    const res = createResponse();

    await register(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "An account with this email already exists."
    );
});







test("register returns 409 when user creation hits a duplicate key", async () => {
    mock.method(
        User,
        "findOne",
        () => ({
            select: async () => null
        })
    );

    mock.method(
        User,
        "create",
        async () => {
            const error = new Error(
                "duplicate email"
            );

            error.code = 11000;

            throw error;
        }
    );

    const req = createRequest({
        email: "duplicate@example.com",
        password: "Register-Test-789!"
    });

    const res = createResponse();

    await register(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "An account with this email already exists."
    );
});

test("register returns 500 when user creation fails unexpectedly", async () => {
    mock.method(
        User,
        "findOne",
        () => ({
            select: async () => null
        })
    );

    mock.method(
        User,
        "create",
        async () => {
            throw new Error(
                "database failure"
            );
        }
    );

    const req = createRequest({
        email: "database-failure@example.com",
        password: "Register-Test-789!"
    });

    const res = createResponse();

    await register(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Failed to create account."
    );
});


/*==================================================
    Verify Email Tests
==================================================*/

test("verifyEmail rejects invalid request data", async () => {

    const req = {
        query: {}
    };

    const res = createResponse();

    await verifyEmail(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid email verification request."
    );

});


test("verifyEmail rejects an invalid or expired token", async () => {

    mockVerificationTransaction();

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => null
        })
    );

    const req = {
        query: {
            token: "invalid-verification-token"
        }
    };

    const res = createResponse();

    await verifyEmail(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid or expired verification token."
    );

});


test("verifyEmail rejects a token when the user no longer exists", async () => {

     mockVerificationTransaction();

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => ({
                userId: "missing-user-123"
            })
        })
    );

mock.method(
    User,
    "findById",
    () => ({
        session: async () => null
    })
);


    const req = {
        query: {
            token: "valid-looking-verification-token"
        }
    };

    const res = createResponse();

    await verifyEmail(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid or expired verification token."
    );

});


test("verifyEmail marks an unverified user as verified", async () => {

       mockVerificationTransaction();

    const user = {
        _id: "verify-user-123",
        email: "verify@example.com",
        emailVerified: false,
        save: mock.fn(async function save() {
            return this;
        })
    };

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => ({
                userId: user._id
            })
        })
    );

mock.method(
    User,
    "findById",
    () => ({
        session: async () => user
    })
);
    const req = {
        query: {
            token: "valid-verification-token"
        }
    };

    const res = createResponse();

    await verifyEmail(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        200
    );

    assert.equal(
        res.body.success,
        true
    );

    assert.equal(
        res.body.message,
        "Email verified successfully."
    );

    assert.equal(
        res.body.data.id,
        user._id
    );

    assert.equal(
        res.body.data.email,
        user.email
    );

    assert.equal(
        res.body.data.emailVerified,
        true
    );

    assert.equal(
        user.emailVerified,
        true
    );

    assert.equal(
        user.save.mock.calls.length,
        1
    );

});


test("verifyEmail returns 500 when verification fails unexpectedly", async () => {

    mockVerificationTransaction();

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => {
                throw new Error(
                    "database failure"
                );
            }
        })
    );

    const req = {
        query: {
            token: "verification-error-token"
        }
    };

    const res = createResponse();

    await verifyEmail(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        500
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Failed to verify email."
    );

});
/*==================================================
    Forgot Password Tests
==================================================*/

test("forgotPassword rejects invalid request data", async () => {

    const req = createRequest({
        email: "not-an-email"
    });

    const res = createResponse();

    await forgotPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "A valid email address is required."
    );

});


test("forgotPassword returns a generic success response for an unknown email", async () => {

    mock.method(
        User,
        "findOne",
        async () => null
    );

    const req = createRequest({
        email: "unknown@example.com"
    });

    const res = createResponse();

    await forgotPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        200
    );

    assert.equal(
        res.body.success,
        true
    );

    assert.equal(
        res.body.message,
        "If an account with that email exists, a password reset link has been sent."
    );

});


test("forgotPassword returns 500 when the user lookup fails unexpectedly", async () => {

    mock.method(
        User,
        "findOne",
        async () => {
            throw new Error(
                "database failure"
            );
        }
    );

    const req = createRequest({
        email: "lookup-failure@example.com"
    });

    const res = createResponse();

    await forgotPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        500
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Failed to process password reset request."
    );

});

/*==================================================
    Reset Password Tests
==================================================*/

test("resetPassword rejects invalid request data", async () => {

    const req = createRequest({
        token: "",
        newPassword: "short"
    });

    const res = createResponse();

    await resetPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid password reset request."
    );

});


test("resetPassword rejects an invalid or expired reset token", async () => {

    const transactionSession = {
        withTransaction: mock.fn(
            async callback => {
                await callback();
            }
        ),

        endSession: mock.fn(
            async () => {}
        )
    };

    mock.method(
        mongoose,
        "startSession",
        async () => transactionSession
    );

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => null
        })
    );

    const req = createRequest({
        token: "invalid-reset-token",
        newPassword: "Reset-Test-789!"
    });

    const res = createResponse();

    await resetPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid or expired password reset token."
    );

    assert.equal(
        transactionSession.endSession.mock.calls.length,
        1
    );

});


test("resetPassword rejects a valid token when the user no longer exists", async () => {

    const transactionSession = {
        withTransaction: mock.fn(
            async callback => {
                await callback();
            }
        ),

        endSession: mock.fn(
            async () => {}
        )
    };

    mock.method(
        mongoose,
        "startSession",
        async () => transactionSession
    );

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => ({
                userId: "missing-user-123"
            })
        })
    );

    mock.method(
        User,
        "findById",
        () => ({
            session: async () => null
        })
    );

    const req = createRequest({
        token: "valid-reset-token",
        newPassword: "Reset-Test-789!"
    });

    const res = createResponse();

    await resetPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        400
    );

    assert.equal(
        res.body.success,
        false
    );

    assert.equal(
        res.body.message,
        "Invalid or expired password reset token."
    );

    assert.equal(
        transactionSession.endSession.mock.calls.length,
        1
    );

});


test("resetPassword updates the password and revokes active sessions", async () => {

    const transactionSession = {
        withTransaction: mock.fn(
            async callback => {
                await callback();
            }
        ),

        endSession: mock.fn(
            async () => {}
        )
    };

    const user = {
        _id: "reset-user-123",
        email: "reset@example.com",
        passwordHash: "old-password-hash",
        save: mock.fn(
            async function save() {
                return this;
            }
        )
    };

    const updateMany = mock.fn(
        async () => ({
            acknowledged: true,
            modifiedCount: 2
        })
    );

    mock.method(
        mongoose,
        "startSession",
        async () => transactionSession
    );

    mock.method(
        VerificationToken,
        "findOneAndUpdate",
        () => ({
            select: async () => ({
                userId: user._id
            })
        })
    );

    mock.method(
        User,
        "findById",
        () => ({
            session: async () => user
        })
    );

    mock.method(
        Session,
        "updateMany",
        updateMany
    );

    const req = createRequest({
        token: "valid-reset-token",
        newPassword: "Reset-Test-789!"
    });

    const res = createResponse();

    await resetPassword(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        200
    );

    assert.equal(
        res.body.success,
        true
    );

    assert.equal(
        res.body.message,
        "Password reset successfully."
    );

    assert.notEqual(
        user.passwordHash,
        "old-password-hash"
    );

    assert.equal(
        user.save.mock.calls.length,
        1
    );

    assert.equal(
        updateMany.mock.calls.length,
        1
    );

    assert.deepEqual(
        updateMany.mock.calls[0].arguments[0],
        {
            userId: user._id,
            revokedAt: null,
            expiresAt: {
                $gt: updateMany.mock.calls[0].arguments[0].expiresAt.$gt
            }
        }
    );

    assert.deepEqual(
        updateMany.mock.calls[0].arguments[1],
        {
            $set: {
                revokedAt: updateMany.mock.calls[0].arguments[1].$set.revokedAt,
                revocationReason: "password_reset"
            }
        }
    );

    assert.deepEqual(
        updateMany.mock.calls[0].arguments[2],
        {
            session: transactionSession
        }
    );

    assert.equal(
        transactionSession.withTransaction.mock.calls.length,
        1
    );

    assert.equal(
        transactionSession.endSession.mock.calls.length,
        1
    );

});
