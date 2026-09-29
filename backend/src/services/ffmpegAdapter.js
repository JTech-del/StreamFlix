"use strict";

import { spawn } from "node:child_process";

const FFMPEG_COMMAND =
    process.env.FFMPEG_PATH || "ffmpeg";

export function runFFmpeg(
    args,
    {
        cwd = undefined,
        timeoutMs = 15 * 60 * 1000
    } = {}
) {
    if (!Array.isArray(args)) {
        const error = new Error(
            "FFmpeg arguments must be an array."
        );

        error.code = "INVALID_FFMPEG_ARGUMENTS";

        return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
        const processHandle = spawn(
            FFMPEG_COMMAND,
            args,
            {
                cwd,
                windowsHide: true,
                stdio: [
                    "ignore",
                    "pipe",
                    "pipe"
                ]
            }
        );

        let stdout = "";
        let stderr = "";
        let settled = false;

        const finish = (
            callback,
            value
        ) => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeoutHandle);

            callback(value);
        };

        const timeoutHandle = setTimeout(() => {
            processHandle.kill("SIGKILL");

            const error = new Error(
                "FFmpeg process timed out."
            );

            error.code =
                "FFMPEG_PROCESS_TIMEOUT";

            finish(reject, error);
        }, timeoutMs);

        processHandle.stdout.on(
            "data",
            (chunk) => {
                stdout += chunk.toString();
            }
        );

        processHandle.stderr.on(
            "data",
            (chunk) => {
                stderr += chunk.toString();
            }
        );

        processHandle.on(
            "error",
            (error) => {
                error.code =
                    error.code ||
                    "FFMPEG_PROCESS_ERROR";

                finish(reject, error);
            }
        );

        processHandle.on(
            "close",
            (code, signal) => {
                if (code === 0) {
                    finish(resolve, {
                        code,
                        signal,
                        stdout,
                        stderr
                    });

                    return;
                }

                const error = new Error(
                    "FFmpeg process failed."
                );

                error.code =
                    "FFMPEG_PROCESS_FAILED";

                error.exitCode = code;
                error.signal = signal;
                error.stdout = stdout;
                error.stderr = stderr;

                finish(reject, error);
            }
        );
    });
}

export function getFFmpegCommand() {
    return FFMPEG_COMMAND;
}
