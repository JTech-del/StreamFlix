"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";

import {
    start,
    shutdown
} from "../../src/workers/notificationWorkerRunner.js";

import {
    getDatabaseState
} from "../../src/config/database.js";

import {
    getRabbitMQChannel
} from "../../src/services/rabbitmqService.js";


test.after(async () => {
    await shutdown("TEST_CLEANUP");
});


test(
    "notification worker runner starts MongoDB, RabbitMQ, topology, and worker",
    async () => {

        const result =
            await start();

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
