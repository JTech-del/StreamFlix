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

function pipeVideoFile(req, res, video, statusCode, headers, options = {}) {
    res.writeHead(statusCode, headers);
    if (req.method === "HEAD") return res.end();

    const stream = fs.createReadStream(video.filePath, options);
    const closeStream = () => stream.destroy();
    res.once("close", closeStream);
    stream.once("error", () => {
        res.removeListener("close", closeStream);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Failed to stream video." });
        } else {
            res.destroy();
        }
    });
    stream.once("close", () => res.removeListener("close", closeStream));
    return stream.pipe(res);
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

    res.set("Cache-Control", "no-store, private");
    res.set("Referrer-Policy", "no-referrer");

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

        return res
            .status(416)
            .set({

                "Content-Range": `bytes */${video.fileSize}`

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
