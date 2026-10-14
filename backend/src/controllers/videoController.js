"use strict";

/*==================================================
    StreamFlix

    Video Controller

    Responsibility:

    ✓ Stream movie videos
    ✓ Stream trailer videos
    ✓ Support HTTP range requests
    ✓ Return correct video headers
    ✓ Handle streaming errors

    Does NOT handle:

    ✗ File path resolution
    ✗ Database access
    ✗ DOM
    ✗ Frontend state
==================================================*/

import fs from "node:fs";

import {
    getVideoStream,
    getTrailerStream,
    hasMovieVideoFile
} from "../services/videoService.js";
import { getMovieById } from "../services/movieService.js";
import { createPlaybackGrant } from "../services/playbackGrantService.js";
import config from "../config/config.js";

const videoHandleClosePromises = new WeakMap();

function closeVideoHandle(fileHandle) {
    if (!fileHandle) return Promise.resolve();
    if (videoHandleClosePromises.has(fileHandle)) {
        return videoHandleClosePromises.get(fileHandle);
    }

    const closePromise = fileHandle.close().catch((error) => {
        if (fileHandle.fd === -1) return;
        throw error;
    });
    videoHandleClosePromises.set(fileHandle, closePromise);
    return closePromise;
}

function pipeVideoFile(req, res, video, statusCode, headers, options = {}) {
    let stream;
    let responseCloseHandler;
    let responseErrorHandler;
    let streamErrorHandler;
    let streamCloseHandler;
    let streamErrorListenerAttached = false;
    let streamCloseListenerAttached = false;
    const cleanupResponse = () => {
        if (responseCloseHandler) res.removeListener("close", responseCloseHandler);
        if (responseErrorHandler) res.removeListener("error", responseErrorHandler);
    };
    const cleanup = () => {
        cleanupResponse();
        if (streamErrorHandler) stream?.removeListener("error", streamErrorHandler);
        if (streamCloseHandler) stream?.removeListener("close", streamCloseHandler);
    };

    try {
        res.writeHead(statusCode, headers);
        if (req.method === "HEAD") {
            return closeVideoHandle(video.fileHandle).then(() => res.end());
        }

        stream = video.fileHandle
            ? video.fileHandle.createReadStream({
                ...options,
                start: options.start ?? 0,
                autoClose: true
            })
            : fs.createReadStream(video.filePath, options);

        responseCloseHandler = () => {
            cleanupResponse();
            if (!res.writableFinished && !stream.destroyed) stream.destroy();
            if (stream.closed) cleanup();
        };
        responseErrorHandler = () => {
            cleanupResponse();
            if (!stream.destroyed) stream.destroy();
        };
        streamErrorHandler = () => {
            cleanupResponse();
            if (!res.destroyed) res.destroy();
        };
        streamCloseHandler = cleanup;

        res.once("close", responseCloseHandler);
        res.once("error", responseErrorHandler);
        stream.once("error", streamErrorHandler);
        streamErrorListenerAttached = true;
        stream.once("close", streamCloseHandler);
        streamCloseListenerAttached = true;

        return stream.pipe(res);
    } catch (error) {
        cleanupResponse();
        if (stream) {
            // The stream owns the handle after construction and closes it on destroy.
            if (!streamErrorListenerAttached) stream.once("error", () => {});
            if (!streamCloseListenerAttached) stream.once("close", cleanup);
            if (!stream.destroyed) stream.destroy();
            if (stream.closed) cleanup();
        } else {
            cleanup();
            void closeVideoHandle(video.fileHandle).catch(() => {});
        }
        throw error;
    }
}

export async function issuePlaybackAuthorization(req, res) {
    const movieId = Number(req.params.movieId);
    if (!/^[1-9]\d*$/.test(req.params.movieId || "") || !Number.isSafeInteger(movieId)) {
        return res.status(400).json({ success: false, message: "Invalid movie ID." });
    }

    try {
        const movie = await getMovieById(movieId);
        if (!movie || !movie.video || !hasMovieVideoFile(movie.video)) {
            return res.status(404).json({ success: false, message: "Movie video is unavailable." });
        }

        const grant = createPlaybackGrant({
            userId: req.user.id,
            sessionId: req.user.sessionId,
            movieId
        });
        res.set("Cache-Control", "no-store, private");
        res.set("Referrer-Policy", "no-referrer");
        return res.json({
            success: true,
            data: { grant, expiresIn: config.playbackGrantTtlSeconds }
        });
    } catch {
        return res.status(503).json({ success: false, message: "Playback authorization is temporarily unavailable." });
    }
}


/*==================================================
    Send Video Stream
==================================================*/

function sendVideoStream(
    req,
    res,
    video
) {

    try {
        res.set("Cache-Control", "no-store, private");
        res.set("Referrer-Policy", "no-referrer");
    } catch (error) {
        // The stream has not taken ownership of the file handle yet.
        void closeVideoHandle(video.fileHandle).catch(() => {});
        throw error;
    }

    /*----------------------------------------------
        Video Not Found
    ----------------------------------------------*/

    if (!video.found) {

        return res.status(404).json({

            success: false,

            message: "Video not found"

        });

    }


    /*----------------------------------------------
        Invalid Range
    ----------------------------------------------*/

    if (video.invalidRange) {
        void closeVideoHandle(video.fileHandle).catch(() => {});

        return res
            .status(416)
            .set({
                "Content-Range": `bytes */${video.fileSize}`,
                "Accept-Ranges": "bytes"
            })
            .json({

                success: false,

                message: "Invalid video range"

            });

    }


    /*----------------------------------------------
        Full Video
    ----------------------------------------------*/

    if (video.status === 200) {

        return pipeVideoFile(req, res, video, 200, {
            "Content-Type": video.contentType,
            "Content-Length": video.fileSize,
            "Accept-Ranges": "bytes"
        });

    }


    /*----------------------------------------------
        Partial Video
    ----------------------------------------------*/

    return pipeVideoFile(req, res, video, 206, {
        "Content-Range": `bytes ${video.start}-${video.end}/${video.fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": video.contentLength,
        "Content-Type": video.contentType
    }, { start: video.start, end: video.end });

}


/*==================================================
    Stream Movie Video
==================================================*/

export async function streamVideo(
    req,
    res
) {

    try {

        const {
            movieId
        } = req.params;


        const range =
            req.headers.range;


        const video =
            await getVideoStream(
                movieId,
                range
            );


        return sendVideoStream(
            req,
            res,
            video
        );

    } catch (error) {

        console.error("Movie video streaming failed.");


        return res.status(500).json({

            success: false,

            message: "Failed to stream movie video"

        });

    }

}


/*==================================================
    Stream Trailer
==================================================*/

export async function streamTrailer(
    req,
    res
) {

    try {

        const {
            movieId
        } = req.params;


        const range =
            req.headers.range;


        const trailer =
            await getTrailerStream(
                movieId,
                range
            );


        return sendVideoStream(
            req,
            res,
            trailer
        );

    } catch (error) {

        console.error(
            "Trailer streaming failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to stream trailer"

        });

    }

}
