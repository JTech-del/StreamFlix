"use strict";

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import config from "../../src/config/config.js";
import Session from "../../src/models/Session.js";
import User from "../../src/models/User.js";

import {
    requireAuthentication
} from "../../src/middleware/authMiddleware.js";


function createResponseMock() {
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

function createAccessTestToken({
    sub,
    sid,
    expiresIn = "5m"
}) {
    return jwt.sign(
        {
            sub,
            sid,
            type: "access"
        },
        config.jwt.accessSecret,
        {
            algorithm: config.jwt.algorithm,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
            expiresIn
        }
    );
}


/*==================================================
    1. Missing Authorization Header
==================================================*/

test(
    "requireAuthentication returns 401 when authorization header is missing",
    async () => {
        const req = {
            headers: {}
        };

        const res = createResponseMock();

        let nextCalled = false;

        await requireAuthentication(
            req,
            res,
            () => {
                nextCalled = true;
            }
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
                    "Authentication required."
            }
        );

        assert.equal(
            nextCalled,
            false
        );
    }
);


/*==================================================
    2. Malformed Authorization Headers
==================================================*/

test(
    "requireAuthentication rejects malformed authorization headers",
    async () => {
        const malformedHeaders = [
            "Basic abc123",
            "Bearer",
            "Bearer    ",
            "Bearer token extra",
            "Token abc123"
        ];

        for (
            const authorization
            of malformedHeaders
        ) {
            const req = {
                headers: {
                    authorization
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
            );

            assert.equal(
                res.statusCode,
                401,
                `Expected 401 for: ${authorization}`
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message:
                        "Invalid authentication header."
                }
            );

            assert.equal(
                nextCalled,
                false,
                `next() should not run for: ${authorization}`
            );
        }
    }
);


/*==================================================
    3. Invalid Access Token
==================================================*/

test(
    "requireAuthentication rejects an invalid access token before session lookup",
    async () => {
        const req = {
            headers: {
                authorization:
                    "Bearer invalid-access-token"
            }
        };

        const res = createResponseMock();

        let nextCalled = false;

        await requireAuthentication(
            req,
            res,
            () => {
                nextCalled = true;
            }
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
                    "Invalid or expired access token."
            }
        );

        assert.equal(
            nextCalled,
            false
        );
    }
);


/*==================================================
    4. Missing Session
==================================================*/

test(
    "requireAuthentication rejects an access token when its session no longer exists",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "user-123",
            sid: "missing-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "missing-session-456"
                    }
                );

                return null;
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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
                        "Session is no longer valid."
                }
            );

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    5. Session Ownership Mismatch
==================================================*/

test(
    "requireAuthentication rejects a session owned by a different user",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "user-123",
            sid: "owned-by-other-session"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "owned-by-other-session"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "different-user-456"
                    },
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 300000
                        )
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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
                        "Session is no longer valid."
                }
            );

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    6. Revoked Session
==================================================*/

test(
    "requireAuthentication rejects a revoked session",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "user-123",
            sid: "revoked-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "revoked-session-456"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "user-123"
                    },
                    revokedAt:
                        new Date(),
                    expiresAt:
                        new Date(
                            Date.now() + 300000
                        )
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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
                        "Session is no longer valid."
                }
            );

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    7. Expired Session
==================================================*/

test(
    "requireAuthentication rejects an expired session",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "user-123",
            sid: "expired-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "expired-session-456"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "user-123"
                    },
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() - 300000
                        )
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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
                        "Session is no longer valid."
                }
            );

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    8. Missing User
==================================================*/

test(
    "requireAuthentication rejects an access token when the user no longer exists",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "missing-user-123",
            sid: "valid-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "valid-session-456"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "missing-user-123"
                    },
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 300000
                        )
                };
            }
        );

        mock.method(
            User,
            "findById",
            async userId => {
                assert.equal(
                    userId,
                    "missing-user-123"
                );

                return null;
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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
                        "Authentication required."
                }
            );

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    9. Suspended Account
==================================================*/

test(
    "requireAuthentication rejects a suspended account",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "suspended-user-123",
            sid: "suspended-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "suspended-session-456"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "suspended-user-123"
                    },
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 300000
                        )
                };
            }
        );

        mock.method(
            User,
            "findById",
            async userId => {
                assert.equal(
                    userId,
                    "suspended-user-123"
                );

                return {
                    _id:
                        "suspended-user-123",
                    role: "user",
                    status: "suspended"
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    10. Disabled Account
==================================================*/

test(
    "requireAuthentication rejects a disabled account",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "disabled-user-123",
            sid: "disabled-session-456"
        });

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "disabled-session-456"
                    }
                );

                return {
                    userId: {
                        toString: () =>
                            "disabled-user-123"
                    },
                    revokedAt: null,
                    expiresAt:
                        new Date(
                            Date.now() + 300000
                        )
                };
            }
        );

        mock.method(
            User,
            "findById",
            async userId => {
                assert.equal(
                    userId,
                    "disabled-user-123"
                );

                return {
                    _id:
                        "disabled-user-123",
                    role: "user",
                    status: "disabled"
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
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

            assert.equal(
                nextCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);


/*==================================================
    11. Successful Authentication
==================================================*/

test(
    "requireAuthentication accepts a valid active session",
    async () => {
        const accessToken = createAccessTestToken({
            sub: "active-user-123",
            sid: "active-session-456"
        });

        const session = {
            userId: {
                toString: () =>
                    "active-user-123"
            },

            sessionId:
                "active-session-456",

            revokedAt: null,

            expiresAt:
                new Date(
                    Date.now() + 300000
                ),

            lastUsedAt: null,

            save: mock.fn(
                async function () {
                    return this;
                }
            )
        };

        mock.method(
            Session,
            "findOne",
            async query => {
                assert.deepEqual(
                    query,
                    {
                        sessionId:
                            "active-session-456"
                    }
                );

                return session;
            }
        );

        mock.method(
            User,
            "findById",
            async userId => {
                assert.equal(
                    userId,
                    "active-user-123"
                );

                return {
                    _id:
                        "active-user-123",
                    role: "user",
                    status: "active"
                };
            }
        );

        try {
            const req = {
                headers: {
                    authorization:
                        `Bearer ${accessToken}`
                }
            };

            const res =
                createResponseMock();

            let nextCalled = false;

            await requireAuthentication(
                req,
                res,
                () => {
                    nextCalled = true;
                }
            );

            assert.equal(
                nextCalled,
                true
            );

            assert.deepEqual(
                req.user,
                {
                    id:
                        "active-user-123",
                    role:
                        "user",
                    sessionId:
                        "active-session-456"
                }
            );

            assert.ok(
                session.lastUsedAt instanceof Date
            );

            assert.equal(
                session.save.mock.calls.length,
                1
            );
        } finally {
            mock.restoreAll();
        }
    }
);
