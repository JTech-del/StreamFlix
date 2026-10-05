"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    startOutboxDispatchRunner,
    stopOutboxDispatchRunner
} from "../../src/workers/outboxDispatchRunner.js";

import {
    connectDatabase,
    disconnectDatabase
} from "../../src/config/database.js";


test.before(async () => {
    await connectDatabase();
});


test.after(async () => {
    await stopOutboxDispatchRunner();
    await disconnectDatabase();
});


test(
    "outbox dispatcher runner starts and reports its running state",
    async () => {

        const result =
            await startOutboxDispatchRunner({
                intervalMs: 100
            });

        assert.equal(
            result.running,
            true
        );

        assert.equal(
            result.alreadyRunning,
            undefined
        );

        assert.equal(
            result.intervalMs,
            100
        );


        const alreadyRunning =
            await startOutboxDispatchRunner({
                intervalMs: 100
            });

        assert.equal(
            alreadyRunning.running,
            true
        );

        assert.equal(
            alreadyRunning.alreadyRunning,
            true
        );
    }
);


test(
    "outbox dispatcher runner stops cleanly",
    async () => {

        const result =
            await stopOutboxDispatchRunner();

        assert.equal(
            result.running,
            false
        );

        assert.equal(
            result.alreadyStopped,
            undefined
        );


        const alreadyStopped =
            await stopOutboxDispatchRunner();

        assert.equal(
            alreadyStopped.running,
            false
        );

        assert.equal(
            alreadyStopped.alreadyStopped,
            true
        );
    }
);
