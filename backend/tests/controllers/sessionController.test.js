"use strict";

import test, { mock } from "node:test";
import assert from "node:assert/strict";

import Session from "../../src/models/Session.js";
import {
    listSessions,
    revokeSession,
    logoutOtherSessions
} from "../../src/controllers/sessionController.js";
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

test(
    "revokeSession scopes the lookup to the authenticated user",
    async () => {
        let receivedQuery = null;

        const mockFindOne = async query => {
            receivedQuery = query;

            return null;
        };

        mock.method(
            Session,
            "findOne",
            mockFindOne
        );

        try {
            const req = {
                params: {
                    sessionId: "target-session-123"
                },
                user: {
                    id: "authenticated-user-456"
                }
            };

            const res = createResponseMock();

            await revokeSession(
                req,
                res
            );

            assert.deepEqual(
                receivedQuery,
                {
                    sessionId: "target-session-123",
                    userId: "authenticated-user-456"
                }
            );

            assert.equal(
                res.statusCode,
                404
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message: "Session not found."
                }
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "revokeSession marks an owned session as revoked",
    async () => {
        let saveCalled = false;

        const session = {
            revokedAt: null,
            revocationReason: null,

            async save() {
                saveCalled = true;
            }
        };

        mock.method(
            Session,
            "findOne",
            async () => session
        );

        try {
            const req = {
                params: {
                    sessionId: "owned-session-123"
                },
                user: {
                    id: "authenticated-user-456"
                }
            };

            const res = createResponseMock();

            await revokeSession(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                200
            );

            assert.deepEqual(
                res.body,
                {
                    success: true,
                    message: "Session revoked successfully."
                }
            );

            assert.ok(
                session.revokedAt instanceof Date
            );

            assert.equal(
                session.revocationReason,
                "user_revoked"
            );

            assert.equal(
                saveCalled,
                true
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "revokeSession rejects an empty session ID",
    async () => {
        let findOneCalled = false;

        mock.method(
            Session,
            "findOne",
            async () => {
                findOneCalled = true;
                return null;
            }
        );

        try {
            const req = {
                params: {
                    sessionId: "   "
                },
                user: {
                    id: "authenticated-user-456"
                }
            };

            const res = createResponseMock();

            await revokeSession(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                400
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    message: "Session ID is required."
                }
            );

            assert.equal(
                findOneCalled,
                false
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "logoutOtherSessions only targets other active sessions for the authenticated user",
    async () => {
        let receivedFilter = null;
        let receivedUpdate = null;

        mock.method(
            Session,
            "updateMany",
            async (filter, update) => {
                receivedFilter = filter;
                receivedUpdate = update;

                return {
                    modifiedCount: 2
                };
            }
        );

        try {
            const req = {
                user: {
                    id: "authenticated-user-456",
                    sessionId: "current-session-123"
                }
            };

            const res = createResponseMock();

            await logoutOtherSessions(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                200
            );

            assert.deepEqual(
                receivedFilter,
                {
                    userId: "authenticated-user-456",
                    sessionId: {
                        $ne: "current-session-123"
                    },
                    revokedAt: null,
                    expiresAt: {
                        $gt: receivedFilter.expiresAt.$gt
                    }
                }
            );

            assert.deepEqual(
                receivedUpdate,
                {
                    $set: {
                        revokedAt: receivedUpdate.$set.revokedAt,
                        revocationReason: "logout_others"
                    }
                }
            );

            assert.equal(
                receivedUpdate.$set.revokedAt instanceof Date,
                true
            );

            assert.deepEqual(
                res.body,
                {
                    success: true,
                    message:
                        "Other sessions logged out successfully.",
                    data: {
                        revokedCount: 2
                    }
                }
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "logoutOtherSessions revokes matching sessions with the correct reason",
    async () => {
        let receivedUpdate = null;

        mock.method(
            Session,
            "updateMany",
            async (_filter, update) => {
                receivedUpdate = update;

                return {
                    modifiedCount: 3
                };
            }
        );

        try {
            const req = {
                user: {
                    id: "authenticated-user-456",
                    sessionId: "current-session-123"
                }
            };

            const res = createResponseMock();

            await logoutOtherSessions(
                req,
                res
            );

            assert.ok(
                receivedUpdate
            );

            assert.ok(
                receivedUpdate.$set.revokedAt instanceof Date
            );

            assert.equal(
                receivedUpdate.$set.revocationReason,
                "logout_others"
            );

            assert.equal(
                res.statusCode,
                200
            );

            assert.equal(
                res.body.data.revokedCount,
                3
            );
        } finally {
            mock.restoreAll();
        }
    }
);

test(
    "listSessions returns only active sessions for the authenticated user",
    async () => {
        let receivedFilter = null;
        let receivedSelect = null;
        let receivedSort = null;

        const sessions = [
            {
                sessionId: "current-session-123",
                device: "Windows Desktop",
                ipAddress: "192.168.1.10",
                userAgent: "Test Browser",
                createdAt: new Date("2026-09-20T10:00:00.000Z"),
                lastUsedAt: new Date("2026-09-25T10:00:00.000Z"),
                expiresAt: new Date("2026-10-01T10:00:00.000Z")
            },
            {
                sessionId: "other-session-456",
                device: "Android",
                ipAddress: "192.168.1.20",
                userAgent: "Mobile Browser",
                createdAt: new Date("2026-09-21T10:00:00.000Z"),
                lastUsedAt: new Date("2026-09-24T10:00:00.000Z"),
                expiresAt: new Date("2026-10-02T10:00:00.000Z")
            }
        ];

        const query = {
            select(value) {
                receivedSelect = value;
                return this;
            },

            sort(value) {
                receivedSort = value;
                return this;
            },

            async lean() {
                return sessions;
            }
        };

        mock.method(
            Session,
            "find",
            filter => {
                receivedFilter = filter;
                return query;
            }
        );

        try {
            const req = {
                user: {
                    id: "authenticated-user-456",
                    sessionId: "current-session-123"
                }
            };

            const res = createResponseMock();

            await listSessions(
                req,
                res
            );

            assert.equal(
                res.statusCode,
                200
            );

            assert.deepEqual(
                receivedFilter.userId,
                "authenticated-user-456"
            );

            assert.equal(
                receivedFilter.revokedAt,
                null
            );

            assert.ok(
                receivedFilter.expiresAt.$gt instanceof Date
            );

            assert.equal(
                receivedSelect,
                "-refreshTokenHash"
            );

            assert.deepEqual(
                receivedSort,
                {
                    lastUsedAt: -1,
                    createdAt: -1
                }
            );

            assert.deepEqual(
                res.body.data.sessions.map(
                    session => session.sessionId
                ),
                [
                    "current-session-123",
                    "other-session-456"
                ]
            );

            assert.equal(
                res.body.data.sessions[0].isCurrent,
                true
            );

            assert.equal(
                res.body.data.sessions[1].isCurrent,
                false
            );

            assert.equal(
                res.body.data.sessions[0].refreshTokenHash,
                undefined
            );
        } finally {
            mock.restoreAll();
        }
    }
);
