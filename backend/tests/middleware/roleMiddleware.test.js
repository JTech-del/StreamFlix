"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    requireRole
} from "../../src/middleware/roleMiddleware.js";


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


/*==================================================
    Missing Authentication
==================================================*/

test(
    "requireRole returns 401 when req.user is missing",
    () => {

        const middleware =
            requireRole("admin");

        const req = {};

        const res =
            createResponseMock();

        let nextCalled = false;

        middleware(
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
    Insufficient Permissions
==================================================*/

test(
    "requireRole returns 403 when user role is not allowed",
    () => {

        const middleware =
            requireRole("admin");

        const req = {

            user: {

                role: "user"

            }

        };

        const res =
            createResponseMock();

        let nextCalled = false;

        middleware(
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
                    "Insufficient permissions."
            }
        );

        assert.equal(
            nextCalled,
            false
        );

    }
);


/*==================================================
    Authorized Admin
==================================================*/

test(
    "requireRole calls next for an allowed admin role",
    () => {

        const middleware =
            requireRole("admin");

        const req = {

            user: {

                role: "admin"

            }

        };

        const res =
            createResponseMock();

        let nextCalled = false;

        middleware(
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

        assert.equal(
            res.statusCode,
            null
        );

        assert.equal(
            res.body,
            null
        );

    }
);


/*==================================================
    Multiple Allowed Roles
==================================================*/

test(
    "requireRole accepts any configured allowed role",
    () => {

        const middleware =
            requireRole(
                "admin",
                "moderator"
            );

        const req = {

            user: {

                role: "moderator"

            }

        };

        const res =
            createResponseMock();

        let nextCalled = false;

        middleware(
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

        assert.equal(
            res.statusCode,
            null
        );

    }
);


/*==================================================
    No Allowed Roles
==================================================*/

test(
    "requireRole returns 403 when no allowed roles are configured",
    () => {

        const middleware =
            requireRole();

        const req = {

            user: {

                role: "admin"

            }

        };

        const res =
            createResponseMock();

        let nextCalled = false;

        middleware(
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
                    "Insufficient permissions."
            }
        );

        assert.equal(
            nextCalled,
            false
        );

    }
);
