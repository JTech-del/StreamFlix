import Job from "../models/Job.js";

const JOB_TRANSITIONS = {
    queued: ["processing"],
    processing: ["completed", "failed"],
    failed: ["retrying", "dead-lettered"],
    retrying: ["queued"],
    completed: [],
    "dead-lettered": [],
};

export function validateJobTransition(currentStatus, nextStatus) {
    const allowedTransitions = JOB_TRANSITIONS[currentStatus];

    if (!allowedTransitions) {
        throw new Error(`Unknown current job status: ${currentStatus}`);
    }

    if (!allowedTransitions.includes(nextStatus)) {
        throw new Error(
            `Invalid job transition: ${currentStatus} → ${nextStatus}`
        );
    }
    return true;
}

export async function createJob({
    type,
    entityType,
    entityId = null,
    maxAttempts = 3,
    correlationId = null,
    metadata = {},
    session = null,
}) {
    if (!type) {
        throw new Error("Job type is required.");
    }

    const job = new Job({
        type,
        entityType,
        entityId,
        status: "queued",
        attempt: 0,
        maxAttempts,
        correlationId,
        metadata,
    });

    if (session) {
        await job.save({ session });
    } else {
        await job.save();
    }

    return job;
}

export async function transitionJob(jobId, nextStatus, updates = {}) {
    const job = await Job.findOne({ jobId });

    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    validateJobTransition(job.status, nextStatus);

    job.status = nextStatus;

    Object.assign(job, updates);

    await job.save();

    return job;
}
export async function startJob(jobId, worker) {
    return transitionJob(jobId, "processing", {
        startedAt: new Date(),
        worker,
    });
}

export async function completeJob(
    jobId,
    updates = {}
) {
    return transitionJob(
        jobId,
        "completed",
        {
            completedAt: new Date(),
            nextAttemptAt: null,
            ...updates
        }
    );
}

export async function claimJob(
    jobId,
    worker
) {
    if (!jobId) {
        throw new Error(
            "Job ID is required."
        );
    }

    if (!worker) {
        throw new Error(
            "Worker information is required."
        );
    }

    const job =
        await Job.findOneAndUpdate(
            {
                jobId,
                status: "queued"
            },
            {
                $set: {
                    status: "processing",
                    startedAt: new Date(),
                    worker
                }
            },

{
    returnDocument: "after"
}

        );

    if (!job) {
        return null;
    }

    return job;
}



export async function failJob(jobId, error) {
    return transitionJob(jobId, "failed", {
        failedAt: new Date(),
        lastError: {
            code: error?.code ?? "JOB_FAILED",
            message: error?.message ?? String(error),
            stack: error?.stack ?? null,
            occurredAt: new Date(),
        },
    });
}
export async function retryJob(jobId) {
    const job = await Job.findOne({ jobId });

    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    validateJobTransition(job.status, "retrying");

    if (job.attempt >= job.maxAttempts) {
        return transitionJob(jobId, "dead-lettered", {
            failedAt: new Date(),
        });
    }

    const nextAttempt = job.attempt + 1;

    const delayMs = Math.min(
        1000 * 2 ** (nextAttempt - 1),
        60000
    );

    const nextAttemptAt = new Date(Date.now() + delayMs);

    return transitionJob(jobId, "retrying", {
        attempt: nextAttempt,
        nextAttemptAt,
    });
}
export async function getJobById(jobId) {
    const job = await Job.findOne({ jobId });

    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    return job;
}