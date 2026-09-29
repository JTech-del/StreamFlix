"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    buildNormalizeMp4Args
} from "../../src/services/ffmpegCommandBuilder.js";

test(
    "builds normalized MP4 FFmpeg arguments",
    () => {
        const args =
            buildNormalizeMp4Args({
                inputPath:
                    "C:\\videos\\source.mp4",
                outputPath:
                    "C:\\processing\\output.mp4"
            });

        assert.deepEqual(
            args,
            [
                "-y",

                "-i",
                "C:\\videos\\source.mp4",

                "-map",
                "0:v:0",
                "-map",
                "0:a:0",

                "-c:v",
                "libx264",

                "-preset",
                "medium",

                "-crf",
                "23",

                "-pix_fmt",
                "yuv420p",

                "-c:a",
                "aac",

                "-ar",
                "44100",

                "-ac",
                "2",

                "-b:a",
                "128k",

                "-movflags",
                "+faststart",

                "C:\\processing\\output.mp4"
            ]
        );
    }
);

test(
    "rejects missing input path",
    () => {
        assert.throws(
            () =>
                buildNormalizeMp4Args({
                    inputPath: "",
                    outputPath:
                        "output.mp4"
                }),
            {
                code:
                    "INVALID_FFMPEG_INPUT_PATH"
            }
        );
    }
);

test(
    "rejects missing output path",
    () => {
        assert.throws(
            () =>
                buildNormalizeMp4Args({
                    inputPath:
                        "input.mp4",
                    outputPath: ""
                }),
            {
                code:
                    "INVALID_FFMPEG_OUTPUT_PATH"
            }
        );
    }
);
