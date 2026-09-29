"use strict";

import rabbitmqTopology from "../config/rabbitmqTopology.js";
import {
    getRabbitMQChannel
} from "../services/rabbitmqService.js";
import {
    claimJob
} from "../services/jobService.js";

import {
    processVideoJob
} from "../services/videoProcessingOrchestrationService.js";

const WORKER_NAME = "video-processing-worker";

function parseMessage(message) {
    if (!message) {
        const error = new Error(
            "RabbitMQ message is required."
        );
        error.code = "INVALID_RABBITMQ_MESSAGE";
        throw error;
    }

    let payload;

    try {
        payload = JSON.parse(
            message.content.toString()
        );
    } catch {
        const error = new Error(
            "Invalid video processing message JSON."
        );
        error.code = "INVALID_VIDEO_PROCESSING_MESSAGE";
        throw error;
    }

    if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {
        const error = new Error(
            "Video processing message must be an object."
        );
        error.code = "INVALID_VIDEO_PROCESSING_MESSAGE";
        throw error;
    }

    if (!payload.jobId) {
        const error = new Error(
            "Video processing message jobId is required."
        );
        error.code = "MISSING_VIDEO_PROCESSING_JOB_ID";
        throw error;
    }

    if (payload.type !== "video-processing") {
        const error = new Error(
            "Unsupported video processing job type."
        );
        error.code = "UNSUPPORTED_VIDEO_PROCESSING_JOB";
        throw error;
    }

    return payload;
}

export async function processVideoProcessingMessage(
    message,
    worker = WORKER_NAME
) {
    const payload = parseMessage(message);

    const job = await claimJob(
        payload.jobId,
        {
            name: worker,
            instanceId: process.pid.toString()
        }
    );

    if (!job) {
        return {
            acknowledged: true,
            claimed: false,
            jobId: payload.jobId
        };
    }

    const processingResult =
    await processVideoJob(
        job.jobId
    );


    return {
    acknowledged: true,
    claimed: true,
    jobId: job.jobId,
    status: processingResult.status,
    processing: processingResult.processing
};

}

export async function startVideoProcessingWorker() {
    const channel = getRabbitMQChannel();

    const queue =
        rabbitmqTopology.queues.videoProcessing;

    await channel.prefetch(1);

    await channel.consume(
        queue.name,
        async (message) => {
            if (!message) {
                return;
            }

            try {
                await processVideoProcessingMessage(
                    message
                );

                channel.ack(message);
            } catch (error) {
                console.error(
                    "Video processing worker error:",
                    error
                );

                channel.nack(
                    message,
                    false,
                    false
                );
            }
        }
    );

    return {
        worker: WORKER_NAME,
        queue: queue.name,
        prefetch: 1
    };
}
