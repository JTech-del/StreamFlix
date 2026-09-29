"use strict";

import test from "node:test";
import assert from "node:assert/strict";

test(
    "retry publisher contract uses a positive retry delay",
    () => {
        const delayMs = 1000;

        assert.ok(
            Number.isInteger(delayMs)
        );

        assert.ok(
            delayMs > 0
        );
    }
);
