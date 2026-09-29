"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
    runFFmpeg,
    getFFmpegCommand
} from "../../src/services/ffmpegAdapter.js";

test(
    "FFmpeg command is available",
    () => {
        assert.equal(
            getFFmpegCommand(),
            process.env.FFMPEG_PATH || "ffmpeg"
        );
    }
);

test(
    "FFmpeg executes a successful command",
    async () => {
        const result =
            await runFFmpeg([
                "-version"
            ]);

        assert.equal(
            result.code,
            0
        );

        assert.ok(
            result.stdout.includes(
                "ffmpeg version"
            )
        );
    }
);

test(
    "invalid FFmpeg arguments are rejected",
    async () => {
        await assert.rejects(
            () => runFFmpeg(null),
            {
                code:
                    "INVALID_FFMPEG_ARGUMENTS"
            }
        );
    }
);

test(
    "FFmpeg process failure exposes exit information",
    async () => {
        await assert.rejects(
            () =>
                runFFmpeg([
                    "-i",
                    "this-file-does-not-exist.mp4",
                    "-f",
                    "null",
                    "-"
                ]),
            (error) => {
                assert.equal(
                    error.code,
                    "FFMPEG_PROCESS_FAILED"
                );

                assert.notEqual(
                    error.exitCode,
                    0
                );

                assert.ok(
                    typeof error.stderr ===
                        "string"
                );

                assert.ok(
                    error.stderr.length > 0
                );

                return true;
            }
        );
    }
);
