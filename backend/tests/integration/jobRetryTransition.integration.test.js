"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    validateJobTransition
} from "../../src/services/jobService.js";

test(
    "allows a retrying job to return to queued state",
    () => {
        assert.equal(
            validateJobTransition(
                "retrying",
                "queued"
            ),
            true
        );
    }
);

test(
    "does not allow a retrying job to skip directly to processing",
    () => {
        assert.throws(
            () =>
                validateJobTransition(
                    "retrying",
                    "processing"
                ),
            /Invalid job transition/
        );
    }
);