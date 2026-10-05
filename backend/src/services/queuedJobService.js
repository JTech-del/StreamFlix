"use strict";

import Job from "../models/Job.js";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1000;

export async function getQueuedJobs({
    limit = DEFAULT_BATCH_SIZE
} = {}) {
    const safeLimit =
        Math.min(
            MAX_BATCH_SIZE,
            Math.max(
                1,
                Number(limit)
            )
        );
return Job.find({
    status: "queued",
    $and: [
        {
            $or: [
                { dispatchLease: null },
                { "dispatchLease.expiresAt": { $lte: new Date() } }
            ]
        },
        {
            $or: [
                { "dispatch.status": { $ne: "published" } },
                {
                    $expr: {
                        $ne: [
                            "$dispatch.attempt",
                            "$attempt"
                        ]
                    }
                }
            ]
        }
    ]
})
    .sort({ createdAt: 1 })
    .limit(safeLimit);

}