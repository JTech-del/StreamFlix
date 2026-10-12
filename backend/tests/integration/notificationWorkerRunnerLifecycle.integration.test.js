"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";
import { startIsolatedMongo } from "../helpers/isolatedMongo.js";

import {
    getRabbitMQChannel
} from "../../src/services/rabbitmqService.js";

let mongoServer;
let start;
let shutdown;
let getDatabaseState;

test.before(async () => {
    mongoServer = await startIsolatedMongo("streamflix_notification_runner_test");
    ({ start, shutdown } = await import("../../src/workers/notificationWorkerRunner.js"));
    ({ getDatabaseState } = await import("../../src/config/database.js"));
});

test.after(async () => {
    await shutdown?.("TEST_CLEANUP");
    await mongoServer?.stop();
});


test(
    "notification worker runner starts MongoDB, RabbitMQ, topology, and worker",
    async () => {

        const result =
            await start({
                startWorker: async () => ({
                    worker: "notification-worker",
                    queue: "streamflix.notification",
                    prefetch: 1
                })
            });

        assert.equal(
            result.worker,
            "notification-worker"
        );

        assert.equal(
            result.queue,
            "streamflix.notification"
        );

        assert.equal(
            result.prefetch,
            1
        );

        assert.equal(
            getDatabaseState(),
            1
        );

        assert.ok(
            mongoose.connection.readyState === 1,
            "MongoDB connection should be ready."
        );

        const channel =
            getRabbitMQChannel();

        assert.ok(
            channel,
            "RabbitMQ channel should be initialized."
        );
    }
);


test(
    "notification worker runner shuts down MongoDB and RabbitMQ cleanly",
    async () => {

        const result =
            await shutdown(
                "TEST_SHUTDOWN"
            );

        assert.equal(
            result,
            undefined
        );

        assert.equal(
            getDatabaseState(),
            0
        );

        assert.equal(
            mongoose.connection.readyState,
            0
        );
    }
);
