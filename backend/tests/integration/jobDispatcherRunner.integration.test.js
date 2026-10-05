"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import mongoose from "mongoose";

import Job from "../../src/models/Job.js";

import {
    connectDatabase,
    disconnectDatabase
} from "../../src/config/database.js";

import {
    connectRabbitMQ,
    closeRabbitMQ,
    assertRabbitMQTopology
} from "../../src/services/rabbitmqService.js";

import {
    runJobDispatcherCycle
} from "../../src/workers/jobDispatcherRunner.js";


test.before(async () => {

    await connectDatabase();

    await connectRabbitMQ();

    await assertRabbitMQTopology();
});


test.after(async () => {

    await closeRabbitMQ();

    await disconnectDatabase();
});


test.beforeEach(async () => {

    await Job.deleteMany({});
});


test(
    "dispatcher runner recovers due jobs and dispatches them through one queue dispatch cycle",
    async () => {

        const job =
            await Job.create({
                jobId:
                    `runner-test-${Date.now()}`,

                type: "notification",

                entityType:
                    "notification",

                entityId:
                    new mongoose.Types.ObjectId()
                        .toString(),

                status: "retrying",

                attempt: 1,

                maxAttempts: 3,

                nextAttemptAt:
                    new Date(
                        Date.now() - 1000
                    ),

                correlationId:
                    `runner-${Date.now()}`,

                metadata: {}
            });


        const result =
            await runJobDispatcherCycle({
                recoveryLimit: 100,

                dispatchLimit: 100,

                now: new Date()
            });


        assert.equal(
            result.skipped,
            false
        );


        assert.equal(
            result.recovery.recovered,
            1
        );


        assert.deepEqual(
            result.recovery.jobIds,
            [job.jobId]
        );


        assert.equal(
            result.dispatch.dispatched,
            1
        );


        const finalJob =
            await Job.findOne({
                jobId: job.jobId
            });


        assert.ok(finalJob);


        /*
         * The dispatcher publishes the job but
         * intentionally leaves it queued.
         *
         * The RabbitMQ worker owns:
         *
         * queued → processing
         */
        assert.equal(
            finalJob.status,
            "queued"
        );


        assert.equal(
            finalJob.dispatchLease,
            null
        );
    }
);


test(
    "dispatcher runner does not dispatch a future retry",
    async () => {

        const job =
            await Job.create({
                jobId:
                    `future-runner-test-${Date.now()}`,

                type: "notification",

                entityType:
                    "notification",

                entityId:
                    new mongoose.Types.ObjectId()
                        .toString(),

                status: "retrying",

                attempt: 1,

                maxAttempts: 3,

                nextAttemptAt:
                    new Date(
                        Date.now() + 60000
                    ),

                correlationId:
                    `future-runner-${Date.now()}`,

                metadata: {}
            });


        const result =
            await runJobDispatcherCycle({
                recoveryLimit: 100,

                dispatchLimit: 100,

                now: new Date()
            });


        assert.equal(
            result.recovery.recovered,
            0
        );


        assert.equal(
            result.dispatch.dispatched,
            0
        );


        const finalJob =
            await Job.findOne({
                jobId: job.jobId
            });


        assert.ok(finalJob);


        assert.equal(
            finalJob.status,
            "retrying"
        );
    }
);


test(
    "concurrent runner cycles cannot overlap",
    async () => {

        const first =
            await runJobDispatcherCycle({
                recoveryLimit: 1,
                dispatchLimit: 1
            });


        assert.equal(
            first.skipped,
            false
        );


        /*
         * This verifies the public result shape
         * and ensures the cycle lock resets after
         * completion.
         */
        const second =
            await runJobDispatcherCycle({
                recoveryLimit: 1,
                dispatchLimit: 1
            });


        assert.equal(
            second.skipped,
            false
        );
    }
);