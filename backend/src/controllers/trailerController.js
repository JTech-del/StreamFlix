"use strict";

/*==================================================
    StreamFlix

    Trailer Controller

    Responsibility:

    ✓ Receive trailer request
    ✓ Get trailer stream information
    ✓ Handle HTTP status
    ✓ Handle Range requests
    ✓ Stream trailer to client

    Does NOT handle:

    ✗ Locate physical trailer files
    ✗ Movie database logic
    ✗ DOM
    ✗ Frontend state
==================================================*/

import fs from "node:fs";

import {
    getTrailerStream
} from "../services/trailerService.js";


/*==================================================
    Stream Trailer
==================================================*/

export async function streamTrailer(req, res) {

    try {

        const {
            movieId
        } = req.params;


        const range =
            req.headers.range;


        /*------------------------------------------
            Get Trailer Stream
        ------------------------------------------*/

        const trailer =
            await getTrailerStream(
                movieId,
                range
            );


        /*------------------------------------------
            Trailer Not Found
        ------------------------------------------*/

        if (!trailer.found) {

            return res.status(404).json({

                success: false,

                message: "Trailer not found"

            });

        }


        /*------------------------------------------
            Invalid Range
        ------------------------------------------*/

        if (trailer.invalidRange) {

            return res
                .status(416)
                .set({

                    "Content-Range": `bytes */${trailer.fileSize}`

                })
                .json({

                    success: false,

                    message: "Invalid trailer range"

                });

        }


        /*------------------------------------------
            Full Trailer
        ------------------------------------------*/

        if (trailer.status === 200) {

            res.writeHead(

                200,

                {

                    "Content-Type": trailer.contentType,

                    "Content-Length": trailer.fileSize,

                    "Accept-Ranges": "bytes"

                }

            );


            return fs
                .createReadStream(
                    trailer.filePath
                )
                .pipe(res);

        }


        /*------------------------------------------
            Partial Trailer
        ------------------------------------------*/

        if (trailer.status === 206) {

            res.writeHead(

                206,

                {

                    "Content-Range": `bytes ${trailer.start}-${trailer.end}/${trailer.fileSize}`,

                    "Accept-Ranges": "bytes",

                    "Content-Length": trailer.contentLength,

                    "Content-Type": trailer.contentType

                }

            );


            return fs
                .createReadStream(

                    trailer.filePath,

                    {

                        start: trailer.start,

                        end: trailer.end

                    }

                )
                .pipe(res);

        }


        /*------------------------------------------
            Unexpected Stream Status
        ------------------------------------------*/

        return res.status(500).json({

            success: false,

            message: "Invalid trailer stream state"

        });


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