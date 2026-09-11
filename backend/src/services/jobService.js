import Job from "../models/Job.js";

const JOB_TRANSITIONS = {
    queued: ["processing"],
    processing: ["completed", "failed"],
    failed: ["retrying", "dead-lettered"],
    retrying: ["processing"],
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
}) {
    if (!type) {
        throw new Error("Job type is required.");
    }

    const job = await Job.create({
        type,
        entityType,
        entityId,
        status: "queued",
        attempt: 0,
        maxAttempts,
        correlationId,
        metadata,
    });

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
export async function completeJob(jobId) {
    return transitionJob(jobId, "completed", {
        completedAt: new Date(),
    });
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