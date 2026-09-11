"use strict";

import { getMovieImage } from "../services/imageService.js";


/*==================================================
    Stream Movie Image
==================================================*/

export async function streamMovieImage(req, res) {

    try {

        const {
            movieId,
            type
        } = req.params;


        const result =
            await getMovieImage(
                movieId,
                type
            );


        /*------------------------------------------
            Image Not Found
        ------------------------------------------*/

        if (!result.found) {

            return res.status(404).json({

                success: false,

                message: "Movie image not found"

            });

        }


        /*------------------------------------------
            Response Headers
        ------------------------------------------*/

        res.setHeader(
            "Content-Type",
            result.contentType
        );

        res.setHeader(
            "Content-Length",
            result.fileSize
        );

        res.setHeader(
            "Cache-Control",
            "public, max-age=86400"
        );


        /*------------------------------------------
            Send Image
        ------------------------------------------*/

        return res.sendFile(
            result.filePath
        );

    } catch (error) {

        console.error(
            "Failed to load movie image:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to load movie image"

        });

    }

}