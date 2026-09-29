"use strict";

import {
    getJobById,
        completeJob
} from "./jobService.js";

import {
    prepareVideoProcessing,
    normalizePreparedVideo
} from "./videoProcessingPipelineService.js";

export async function processVideoJob(jobId) {
    if (
        typeof jobId !== "string" ||
        !jobId.trim()
    ) {
        const error = new Error(
            "Video processing job ID is required."
        );

        error.code =
            "INVALID_VIDEO_PROCESSING_JOB_ID";

        throw error;
    }

    const job =
        await getJobById(jobId);

    if (job.type !== "video-processing") {
        const error = new Error(
            "Job is not a video processing job."
        );

        error.code =
            "INVALID_VIDEO_PROCESSING_JOB_TYPE";

        throw error;
    }

    if (job.status !== "processing") {
        const error = new Error(
            "Video processing job must be in processing status."
        );

        error.code =
            "INVALID_VIDEO_PROCESSING_JOB_STATUS";

        throw error;
    }

    const movieId =
        Number(job.entityId);

    const processingContext =
        await prepareVideoProcessing(
            movieId,
            job.jobId
        );

    const result =
        await normalizePreparedVideo(
            processingContext
        );

        await completeJob(job.jobId);

    return {
        jobId: job.jobId,
        movieId,
        status: "processed",
        processing: result
    };
}