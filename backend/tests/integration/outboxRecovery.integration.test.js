"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import OutboxEvent from "../../src/models/OutboxEvent.js";

import {
    connectDatabase,
    disconnectDatabase
} from "../../src/config/database.js";

import {
    recoverDueOutboxEvents
} from "../../src/services/outboxRecoveryService.js";

function createEventData(overrides = {}) {
    return {
        eventId: crypto.randomUUID(),
        eventType: "movie.published",
        aggregateType: "Movie",
        aggregateId: crypto.randomUUID(),
        payload: {
            movieId: 1,
            title: "Recovery Test Movie"
        },
        status: "failed",
        attempts: 1,
        maxAttempts: 3,
        nextAttemptAt: new Date(Date.now() - 1000),
        ...overrides
    };
}

test.before(async () => {
    await connectDatabase();
});

test.beforeEach(async () => {
    await OutboxEvent.deleteMany({
        eventType: "movie.published"
    });
});

test.after(async () => {
    await OutboxEvent.deleteMany({
        eventType: "movie.published"
    });

    await disconnectDatabase();
});

test(
    "recovers a failed outbox event whose retry time has elapsed",
    async () => {
        const event =
            await OutboxEvent.create(
                createEventData()
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.length,
            1
        );

        assert.equal(
            recovered[0].eventId,
            event.eventId
        );

        const updated =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            updated.status,
            "pending"
        );

        assert.equal(
            updated.nextAttemptAt,
            null
        );

        assert.equal(
            updated.dispatchLease,
            null
        );
    }
);

test(
    "does not recover a failed event before its retry time",
    async () => {
        const event =
            await OutboxEvent.create(
                createEventData({
                    nextAttemptAt:
                        new Date(
                            Date.now() + 60_000
                        )
                })
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.some(
                item =>
                    item.eventId ===
                    event.eventId
            ),
            false
        );

        const unchanged =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            unchanged.status,
            "failed"
        );
    }
);

test(
    "does not recover an event that exhausted its retry budget",
    async () => {
        const event =
            await OutboxEvent.create(
                createEventData({
                    attempts: 3,
                    maxAttempts: 3
                })
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.some(
                item =>
                    item.eventId ===
                    event.eventId
            ),
            false
        );

        const unchanged =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            unchanged.status,
            "failed"
        );
    }
);

test(
    "does not recover published or pending events",
    async () => {
        const published =
            await OutboxEvent.create(
                createEventData({
                    eventId: crypto.randomUUID(),
                    status: "published"
                })
            );

        const pending =
            await OutboxEvent.create(
                createEventData({
                    eventId: crypto.randomUUID(),
                    status: "pending"
                })
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.some(
                item =>
                    item.eventId ===
                    published.eventId
            ),
            false
        );

        assert.equal(
            recovered.some(
                item =>
                    item.eventId ===
                    pending.eventId
            ),
            false
        );
    }
);

test(
    "recovery clears a stale dispatch lease",
    async () => {
        const event =
            await OutboxEvent.create(
                createEventData({
                    dispatchLease: {
                        leaseId:
                            crypto.randomUUID(),
                        owner: {
                            name:
                                "test-owner",
                            instanceId:
                                "test-instance"
                        },
                        acquiredAt:
                            new Date(
                                Date.now() -
                                60_000
                            ),
                        expiresAt:
                            new Date(
                                Date.now() -
                                30_000
                            )
                    }
                })
            );

        const recovered =
            await recoverDueOutboxEvents();

        assert.equal(
            recovered.length,
            1
        );

        assert.equal(
            recovered[0].dispatchLease,
            null
        );
    }
);

test(
    "recovers multiple events in retry-time order",
    async () => {
        const later =
            await OutboxEvent.create(
                createEventData({
                    nextAttemptAt:
                        new Date(
                            Date.now() -
                            2_000
                        )
                })
            );

        const earlier =
            await OutboxEvent.create(
                createEventData({
                    nextAttemptAt:
                        new Date(
                            Date.now() -
                            5_000
                        )
                })
            );

        const recovered =
            await recoverDueOutboxEvents({
                limit: 2
            });

        assert.equal(
            recovered.length,
            2
        );

        assert.equal(
            recovered[0].eventId,
            earlier.eventId
        );

        assert.equal(
            recovered[1].eventId,
            later.eventId
        );
    }
);

test(
    "respects the recovery batch limit",
    async () => {
        await OutboxEvent.create(
            createEventData()
        );

        await OutboxEvent.create(
            createEventData()
        );

        await OutboxEvent.create(
            createEventData()
        );

        const recovered =
            await recoverDueOutboxEvents({
                limit: 2
            });

        assert.equal(
            recovered.length,
            2
        );
    }
);

test(
    "recovery is safe against concurrent workers",
    async () => {
        const event =
            await OutboxEvent.create(
                createEventData()
            );

        const [
            first,
            second
        ] = await Promise.all([
            recoverDueOutboxEvents({
                limit: 1
            }),

            recoverDueOutboxEvents({
                limit: 1
            })
        ]);

        const firstClaims =
            first.some(
                item =>
                    item.eventId ===
                    event.eventId
            );

        const secondClaims =
            second.some(
                item =>
                    item.eventId ===
                    event.eventId
            );

        assert.equal(
            firstClaims ||
                secondClaims,
            true
        );

        assert.notEqual(
            firstClaims &&
                secondClaims,
            true
        );
    }
);

