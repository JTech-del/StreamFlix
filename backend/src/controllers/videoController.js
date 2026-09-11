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
    getTrailerStream
} from "../services/videoService.js";


/*==================================================
    Send Video Stream
==================================================*/

function sendVideoStream(
    req,
    res,
    video
) {

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

        res.writeHead(

            200,

            {

                "Content-Type": video.contentType,

                "Content-Length": video.fileSize,

                "Accept-Ranges": "bytes"

            }

        );


        return fs
            .createReadStream(
                video.filePath
            )
            .pipe(res);

    }


    /*----------------------------------------------
        Partial Video
    ----------------------------------------------*/

    res.writeHead(

        206,

        {

            "Content-Range": `bytes ${video.start}-${video.end}/${video.fileSize}`,

            "Accept-Ranges": "bytes",

            "Content-Length": video.contentLength,

            "Content-Type": video.contentType

        }

    );


    return fs
        .createReadStream(

            video.filePath,

            {

                start: video.start,

                end: video.end

            }

        )
        .pipe(res);

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

        console.error(
            "Movie video streaming failed:",
            error
        );


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