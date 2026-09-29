"use strict";

import {
    runFFmpeg
} from "./ffmpegAdapter.js";

import {
    buildNormalizeMp4Args
} from "./ffmpegCommandBuilder.js";

export async function normalizeVideoToMp4({
    inputPath,
    outputPath,
    cwd = undefined
}) {
    const args =
        buildNormalizeMp4Args({
            inputPath,
            outputPath
        });

    return runFFmpeg(
        args,
        {
            cwd
        }
    );
}
