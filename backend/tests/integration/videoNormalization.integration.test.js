"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
    runFFmpeg
} from "../../src/services/ffmpegAdapter.js";

import {
    normalizeVideoToMp4
} from "../../src/services/videoNormalizationService.js";

const TEST_DIRECTORY =
    path.resolve(
        process.cwd(),
        "storage/processing/ffmpeg-normalization-test"
    );

const INPUT_PATH =
    path.join(
        TEST_DIRECTORY,
        "input.mp4"
    );

const OUTPUT_PATH =
    path.join(
        TEST_DIRECTORY,
        "normalized.mp4"
    );

test.before(async () => {
    await fs.rm(
        TEST_DIRECTORY,
        {
            recursive: true,
            force: true
        }
    );

    await fs.mkdir(
        TEST_DIRECTORY,
        {
            recursive: true
        }
    );

    await runFFmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=320x180:r=24",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-t",
        "1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        INPUT_PATH
    ]);
});

test.after(async () => {
    await fs.rm(
        TEST_DIRECTORY,
        {
            recursive: true,
            force: true
        }
    );
});

test(
    "normalization service produces a valid MP4",
    async () => {
        const result =
            await normalizeVideoToMp4({
                inputPath:
                    INPUT_PATH,
                outputPath:
                    OUTPUT_PATH
            });

        assert.equal(
            result.code,
            0
        );

        const stats =
            await fs.stat(
                OUTPUT_PATH
            );

        assert.equal(
            stats.isFile(),
            true
        );

        assert.ok(
            stats.size > 0
        );
    }
);
