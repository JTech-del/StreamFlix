"use strict";

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";

import mongoose from "mongoose";

import { connectDatabase } from "../../src/config/database.js";
import OutboxEvent from "../../src/models/OutboxEvent.js";

import {
    claimOutboxDispatchLease,
    releaseOutboxDispatchLease,
    recoverExpiredOutboxDispatchLeases
} from "../../src/services/outboxDispatchLeaseService.js";

before(async () => {
    await connectDatabase();
});

beforeEach(async () => {
    await OutboxEvent.deleteMany({});
});

after(async () => {
    await mongoose.connection.close();
});

async function createPendingEvent(overrides = {}) {
    return OutboxEvent.create({
        eventId:
            overrides.eventId ??
            `test-event-${crypto.randomUUID()}`,
        eventType:
            overrides.eventType ??
            "movie.published",
        aggregateType:
            overrides.aggregateType ??
            "Movie",
        aggregateId:
            overrides.aggregateId ??
            "movie-1",
        payload:
            overrides.payload ??
            {
                movieId: 1
            },
        status:
            overrides.status ??
            "pending",
        dispatchLease:
            overrides.dispatchLease ??
            null
    });
}

function createOwner(name = "test-dispatcher") {
    return {
        name,
        instanceId: crypto.randomUUID()
    };
}

test(
    "claims a pending outbox dispatch lease",
    async () => {
        const event =
            await createPendingEvent();

        const owner =
            createOwner();

        const leasedEvent =
            await claimOutboxDispatchLease(
                event.eventId,
                owner
            );

        assert.ok(leasedEvent);

        assert.equal(
            leasedEvent.eventId,
            event.eventId
        );

        assert.equal(
            leasedEvent.status,
            "pending"
        );

        assert.ok(
            leasedEvent.dispatchLease
        );

        assert.ok(
            leasedEvent.dispatchLease.leaseId
        );

        assert.equal(
            leasedEvent.dispatchLease.owner.name,
            owner.name
        );

        assert.equal(
            leasedEvent.dispatchLease.owner.instanceId,
            owner.instanceId
        );

        assert.ok(
            leasedEvent.dispatchLease.acquiredAt
        );

        assert.ok(
            leasedEvent.dispatchLease.expiresAt
        );
    }
);

test(
    "active lease prevents a second dispatcher from claiming the event",
    async () => {
        const event =
            await createPendingEvent();

        const firstOwner =
            createOwner("dispatcher-1");

        const secondOwner =
            createOwner("dispatcher-2");

        const firstLease =
            await claimOutboxDispatchLease(
                event.eventId,
                firstOwner
            );

        const secondLease =
            await claimOutboxDispatchLease(
                event.eventId,
                secondOwner
            );

        assert.ok(firstLease);
        assert.equal(secondLease, null);
    }
);

test(
    "concurrent dispatchers cannot both acquire the same lease",
    async () => {
        const event =
            await createPendingEvent();

        const ownerA =
            createOwner("dispatcher-a");

        const ownerB =
            createOwner("dispatcher-b");

        const results =
            await Promise.all([
                claimOutboxDispatchLease(
                    event.eventId,
                    ownerA
                ),
                claimOutboxDispatchLease(
                    event.eventId,
                    ownerB
                )
            ]);

        const successfulClaims =
            results.filter(
                (result) => result !== null
            );

        assert.equal(
            successfulClaims.length,
            1
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.ok(storedEvent);
        assert.ok(
            storedEvent.dispatchLease
        );
    }
);

test(
    "release clears the active lease",
    async () => {
        const event =
            await createPendingEvent();

        const owner =
            createOwner();

        const leasedEvent =
            await claimOutboxDispatchLease(
                event.eventId,
                owner
            );

        const leaseId =
            leasedEvent.dispatchLease.leaseId;

        const releasedEvent =
            await releaseOutboxDispatchLease(
                event.eventId,
                leaseId
            );

        assert.ok(releasedEvent);
        assert.equal(
            releasedEvent.dispatchLease,
            null
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            storedEvent.dispatchLease,
            null
        );
    }
);

test(
    "wrong lease ID cannot release another lease",
    async () => {
        const event =
            await createPendingEvent();

        const owner =
            createOwner();

        const leasedEvent =
            await claimOutboxDispatchLease(
                event.eventId,
                owner
            );

        const releasedEvent =
            await releaseOutboxDispatchLease(
                event.eventId,
                "wrong-lease-id"
            );

        assert.equal(
            releasedEvent,
            null
        );

        const storedEvent =
            await OutboxEvent.findOne({
                eventId: event.eventId
            });

        assert.equal(
            storedEvent.dispatchLease.leaseId,
            leasedEvent.dispatchLease.leaseId
        );
    }
);

test(
    "expired lease can be recovered",
    async () => {
        const expiredAt =
            new Date(
                Date.now() - 60_000
            );

        const event =
            await createPendingEvent({
                dispatchLease: {
                    leaseId: "expired-lease",
                    owner: {
                        name: "old-dispatcher",
                        instanceId: "old-instance"
                    },
                    acquiredAt:
                        new Date(
                            Date.now() - 120_000
                        ),
                    expiresAt: expiredAt
                }
            });

        const recoveredEvents =
            await recoverExpiredOutboxDispatchLeases();

        assert.equal(
            recoveredEvents.length,
            1
        );

        assert.equal(
            recoveredEvents[0].eventId,
            event.eventId
        );

        assert.equal(
            recoveredEvents[0].dispatchLease,
            null
        );
    }
);

test(
    "recovery sweep clears only expired pending leases",
    async () => {
        const expiredOne =
            "outbox-recovery-expired-001";

        const expiredTwo =
            "outbox-recovery-expired-002";

        const activeLease =
            "outbox-recovery-active-001";

        const publishedEvent =
            "outbox-recovery-published-001";

        const now = new Date();

        await OutboxEvent.create([
            {
                eventId: expiredOne,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-001",
                payload: {
                    jobId:
                        "job-recovery-001"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "expired-lease-001",
                    owner: {
                        name:
                            "old-dispatcher",
                        instanceId:
                            "old-instance-001"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            60_000
                        )
                }
            },
            {
                eventId: expiredTwo,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-002",
                payload: {
                    jobId:
                        "job-recovery-002"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "expired-lease-002",
                    owner: {
                        name:
                            "old-dispatcher",
                        instanceId:
                            "old-instance-002"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            30_000
                        )
                }
            },
            {
                eventId: activeLease,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-003",
                payload: {
                    jobId:
                        "job-recovery-003"
                },
                status: "pending",
                dispatchLease: {
                    leaseId:
                        "active-lease-001",
                    owner: {
                        name:
                            "active-dispatcher",
                        instanceId:
                            "active-instance"
                    },
                    acquiredAt:
                        now,
                    expiresAt:
                        new Date(
                            now.getTime() +
                            60_000
                        )
                }
            },
            {
                eventId: publishedEvent,
                eventType:
                    "video.processing.requested",
                aggregateType: "Movie",
                aggregateId:
                    "movie-recovery-004",
                payload: {
                    jobId:
                        "job-recovery-004"
                },
                status: "published",
                dispatchLease: {
                    leaseId:
                        "published-lease",
                    owner: {
                        name:
                            "dispatcher",
                        instanceId:
                            "published-instance"
                    },
                    acquiredAt:
                        new Date(
                            now.getTime() -
                            120_000
                        ),
                    expiresAt:
                        new Date(
                            now.getTime() -
                            60_000
                        )
                }
            }
        ]);

        const recovered =
            await recoverExpiredOutboxDispatchLeases({
                now
            });

        assert.equal(
            recovered.length,
            2
        );

        const expiredOneStored =
            await OutboxEvent.findOne({
                eventId: expiredOne
            }).lean();

        const expiredTwoStored =
            await OutboxEvent.findOne({
                eventId: expiredTwo
            }).lean();

        const activeStored =
            await OutboxEvent.findOne({
                eventId: activeLease
            }).lean();

        const publishedStored =
            await OutboxEvent.findOne({
                eventId: publishedEvent
            }).lean();

        assert.equal(
            expiredOneStored.dispatchLease,
            null
        );

        assert.equal(
            expiredTwoStored.dispatchLease,
            null
        );

        assert.ok(
            activeStored.dispatchLease
        );

        assert.equal(
            activeStored.dispatchLease.leaseId,
            "active-lease-001"
        );

        assert.ok(
            publishedStored.dispatchLease
        );

        assert.equal(
            publishedStored.dispatchLease.leaseId,
            "published-lease"
        );
    }
);

test(
    "recovery respects the batch limit",
    async () => {
        await createPendingEvent({
            eventId: "expired-event-1",
            dispatchLease: {
                leaseId: "lease-1",
                owner: {
                    name: "dispatcher",
                    instanceId: "instance-1"
                },
                acquiredAt:
                    new Date(
                        Date.now() - 120_000
                    ),
                expiresAt:
                    new Date(
                        Date.now() - 60_000
                    )
            }
        });

        await createPendingEvent({
            eventId: "expired-event-2",
            dispatchLease: {
                leaseId: "lease-2",
                owner: {
                    name: "dispatcher",
                    instanceId: "instance-2"
                },
                acquiredAt:
                    new Date(
                        Date.now() - 120_000
                    ),
                expiresAt:
                    new Date(
                        Date.now() - 30_000
                    )
            }
        });

        const recoveredEvents =
            await recoverExpiredOutboxDispatchLeases({
                limit: 1
            });

        assert.equal(
            recoveredEvents.length,
            1
        );

        const remaining =
            await OutboxEvent.countDocuments({
                "dispatchLease.leaseId": {
                    $ne: null
                }
            });

        assert.equal(
            remaining,
            1
        );
    }
);

test(
    "non-pending outbox events cannot acquire a dispatch lease",
    async () => {
        const event =
            await createPendingEvent({
                status: "published"
            });

        const lease =
            await claimOutboxDispatchLease(
                event.eventId,
                createOwner()
            );

        assert.equal(
            lease,
            null
        );
    }
);

test(
    "invalid event ID is rejected",
    async () => {
        await assert.rejects(
            () =>
                claimOutboxDispatchLease(
                    "",
                    createOwner()
                ),
            {
                code:
                    "INVALID_OUTBOX_DISPATCH_LEASE_EVENT_ID"
            }
        );
    }
);

test(
    "invalid owner is rejected",
    async () => {
        const event =
            await createPendingEvent();

        await assert.rejects(
            () =>
                claimOutboxDispatchLease(
                    event.eventId,
                    {
                        name: "dispatcher"
                    }
                ),
            {
                code:
                    "INVALID_OUTBOX_DISPATCH_LEASE_OWNER"
            }
        );
    }
);

test(
    "invalid lease duration is rejected",
    async () => {
        const event =
            await createPendingEvent();

        await assert.rejects(
            () =>
                claimOutboxDispatchLease(
                    event.eventId,
                    createOwner(),
                    0
                ),
            {
                code:
                    "INVALID_OUTBOX_DISPATCH_LEASE_DURATION"
            }
        );
    }
);
