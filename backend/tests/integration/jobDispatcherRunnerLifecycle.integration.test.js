"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { startIsolatedMongo } from "../helpers/isolatedMongo.js";

let mongoServer;
let startJobDispatcherRunner;
let stopJobDispatcherRunner;
let connectDatabase;
let disconnectDatabase;


test.before(async () => {
    mongoServer = await startIsolatedMongo("streamflix_job_dispatcher_lifecycle_test");
    ({ startJobDispatcherRunner, stopJobDispatcherRunner } = await import("../../src/workers/jobDispatcherRunner.js"));
    ({ connectDatabase, disconnectDatabase } = await import("../../src/config/database.js"));
    await connectDatabase();
});


test.after(async () => {
    await stopJobDispatcherRunner();
    await disconnectDatabase();
    await mongoServer?.stop();
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
