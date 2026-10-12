"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { startIsolatedMongo } from "../helpers/isolatedMongo.js";

let mongoServer;
let startOutboxDispatchRunner;
let stopOutboxDispatchRunner;
let connectDatabase;
let disconnectDatabase;


test.before(async () => {
    mongoServer = await startIsolatedMongo("streamflix_outbox_dispatch_lifecycle_test");
    ({ startOutboxDispatchRunner, stopOutboxDispatchRunner } = await import("../../src/workers/outboxDispatchRunner.js"));
    ({ connectDatabase, disconnectDatabase } = await import("../../src/config/database.js"));
    await connectDatabase();
});


test.after(async () => {
    await stopOutboxDispatchRunner();
    await disconnectDatabase();
    await mongoServer?.stop();
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
