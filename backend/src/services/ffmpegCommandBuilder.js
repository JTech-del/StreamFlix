"use strict";

import {
    NORMALIZE_MP4_PROFILE
} from "./videoProcessingProfiles.js";

export function buildNormalizeMp4Args({
    inputPath,
    outputPath
}) {
    if (
        typeof inputPath !== "string" ||
        !inputPath.trim()
    ) {
        const error = new Error(
            "FFmpeg input path is required."
        );

        error.code = "INVALID_FFMPEG_INPUT_PATH";

        throw error;
    }

    if (
        typeof outputPath !== "string" ||
        !outputPath.trim()
    ) {
        const error = new Error(
            "FFmpeg output path is required."
        );

        error.code = "INVALID_FFMPEG_OUTPUT_PATH";

        throw error;
    }

    return [
        "-y",

        "-i",
        inputPath,

        "-map",
        "0:v:0",
        "-map",
        "0:a:0",

        "-c:v",
        NORMALIZE_MP4_PROFILE.videoCodec,

        "-preset",
        NORMALIZE_MP4_PROFILE.videoPreset,

        "-crf",
        String(
            NORMALIZE_MP4_PROFILE.videoCrf
        ),

        "-pix_fmt",
        NORMALIZE_MP4_PROFILE.pixelFormat,

        "-c:a",
        NORMALIZE_MP4_PROFILE.audioCodec,

        "-ar",
        String(
            NORMALIZE_MP4_PROFILE.audioSampleRate
        ),

        "-ac",
        String(
            NORMALIZE_MP4_PROFILE.audioChannels
        ),

        "-b:a",
        NORMALIZE_MP4_PROFILE.audioBitrate,

        "-movflags",
        NORMALIZE_MP4_PROFILE.movflags,

        outputPath
    ];
}
