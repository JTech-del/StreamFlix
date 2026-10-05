"use strict";

import OutboxEvent from "../models/OutboxEvent.js";

const DEFAULT_RECOVERY_LIMIT = 100;

export async function recoverDueOutboxEvents({
    limit = DEFAULT_RECOVERY_LIMIT,
    now = new Date()
} = {}) {
    const numericLimit = Number(limit);

    const safeLimit =
        Number.isFinite(numericLimit) && numericLimit > 0
            ? Math.min(Math.floor(numericLimit), 1000)
            : DEFAULT_RECOVERY_LIMIT;

    const recoveredEvents = [];

    for (let index = 0; index < safeLimit; index += 1) {
        const event =
            await OutboxEvent.findOneAndUpdate(
                {
                    status: "failed",
                    nextAttemptAt: {
                        $lte: now
                    },
                    $expr: {
                        $lt: [
                            "$attempts",
                            "$maxAttempts"
                        ]
                    }
                },
                {
                    $set: {
                        status: "pending",
                        nextAttemptAt: null,
                        dispatchLease: null
                    }
                },
                {
                    sort: {
                        nextAttemptAt: 1
                    },
                    returnDocument: "after"
                }
            );

        if (!event) {
            break;
        }

        recoveredEvents.push(event);
    }

    return recoveredEvents;
}
