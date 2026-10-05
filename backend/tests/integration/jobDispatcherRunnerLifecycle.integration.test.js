"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    startJobDispatcherRunner,
    stopJobDispatcherRunner
} from "../../src/workers/jobDispatcherRunner.js";

import {
    connectDatabase,
    disconnectDatabase
} from "../../src/config/database.js";


test.before(async () => {
    await connectDatabase();
});


test.after(async () => {
    await stopJobDispatcherRunner();
    await disconnectDatabase();
});


test(
    "job dispatcher runner starts and reports its running state",
    async () => {

        const result =
            await startJobDispatcherRunner({
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
            await startJobDispatcherRunner({
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
    "job dispatcher runner stops cleanly",
    async () => {

        const result =
            await stopJobDispatcherRunner();

        assert.equal(
            result.running,
            false
        );

        assert.equal(
            result.alreadyStopped,
            undefined
        );


        const alreadyStopped =
            await stopJobDispatcherRunner();

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