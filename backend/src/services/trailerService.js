"use strict";

/*==================================================
    StreamFlix

    Trailer Service

    Responsibility:

    ✓ Find movie by ID
    ✓ Resolve trailer filename
    ✓ Resolve physical trailer path
    ✓ Validate trailer file
    ✓ Validate trailer extension
    ✓ Handle HTTP byte ranges
    ✓ Return trailer stream information

    Does NOT handle:

    ✗ HTTP responses
    ✗ DOM
    ✗ Frontend state
    ✗ Mini Theatre
    ✗ UI
==================================================*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    getMovieById
} from "./movieService.js";


/*==================================================
    Module Paths
==================================================*/

const __filename = fileURLToPath(
    import.meta.url
);

const __dirname = path.dirname(
    __filename
);


/*==================================================
    Backend Root

    backend/src/services
                ↓
            backend/
==================================================*/

const BACKEND_ROOT = path.resolve(
    __dirname,
    "../.."
);


/*==================================================
    Trailer Directory

    Physical trailer storage:

    backend/
        storage/
            trailers/

                trailer-001.mp4
                trailer-002.mp4
                trailer-003.mp4
==================================================*/

const TRAILER_DIRECTORY = path.join(
    BACKEND_ROOT,
    "storage",
    "trailers"
);


/*==================================================
    Supported Trailer Types
==================================================*/

const TRAILER_TYPES = Object.freeze({

    ".mp4": "video/mp4",

    ".webm": "video/webm",

    ".mkv": "video/x-matroska"

});


/*==================================================
    Get Content Type
==================================================*/

function getContentType(filePath) {

    const extension =
        path.extname(filePath)
        .toLowerCase();

    return (
        TRAILER_TYPES[extension] ||
        null
    );

}


/*==================================================
    Resolve Trailer
==================================================*/

async function resolveTrailer(
    movieId
) {

    /*----------------------------------------------
        Get Movie
    ----------------------------------------------*/

    const movie =
        await getMovieById(
            movieId
        );


    if (!movie) {

        console.error(
            `Trailer service: Movie ${movieId} not found.`
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Check Trailer Reference
    ----------------------------------------------*/

    if (!movie.trailer) {

        console.error(
            `Trailer service: Movie ${movieId} has no trailer.`
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Extract Filename
    ----------------------------------------------*/

    const trailerFileName =
        path.basename(
            movie.trailer
        );


    /*----------------------------------------------
        Prevent Path Traversal
    ----------------------------------------------*/

    if (

        !trailerFileName ||

        trailerFileName !== movie.trailer

    ) {

        console.error(
            `Trailer service: Invalid trailer filename for movie ${movieId}:`,
            movie.trailer
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Build Trailer Path
    ----------------------------------------------*/

    const trailerPath =
        path.join(
            TRAILER_DIRECTORY,
            trailerFileName
        );


    /*----------------------------------------------
        Resolve Absolute Paths
    ----------------------------------------------*/

    const resolvedTrailerPath =
        path.resolve(
            trailerPath
        );

    const resolvedTrailerDirectory =
        path.resolve(
            TRAILER_DIRECTORY
        );


    /*----------------------------------------------
        Additional Path Traversal Protection
    ----------------------------------------------*/

    if (

        !resolvedTrailerPath.startsWith(
            resolvedTrailerDirectory +
            path.sep
        )

    ) {

        console.error(
            "Trailer service: Invalid trailer path:",
            resolvedTrailerPath
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Validate Extension
    ----------------------------------------------*/

    const contentType =
        getContentType(
            resolvedTrailerPath
        );


    if (!contentType) {

        console.error(
            "Trailer service: Unsupported trailer extension:",
            resolvedTrailerPath
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Check File
    ----------------------------------------------*/

    if (!fs.existsSync(
            resolvedTrailerPath
        )) {

        console.error(
            "Trailer service: Trailer file not found:",
            resolvedTrailerPath
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        File Information
    ----------------------------------------------*/

    const fileStats =
        fs.statSync(
            resolvedTrailerPath
        );


    if (!fileStats.isFile()) {

        console.error(
            "Trailer service: Path is not a file:",
            resolvedTrailerPath
        );

        return {
            found: false
        };

    }


    console.log(
        "Trailer service:",
        resolvedTrailerPath
    );


    /*----------------------------------------------
        Return Trailer Information
    ----------------------------------------------*/

    return {

        found: true,

        filePath: resolvedTrailerPath,

        fileSize: fileStats.size,

        contentType

    };

}


/*==================================================
    Get Trailer Stream
==================================================*/

export async function getTrailerStream(
    movieId,
    range
) {

    /*----------------------------------------------
        Resolve Trailer
    ----------------------------------------------*/

    const trailer =
        await resolveTrailer(
            movieId
        );


    if (!trailer.found) {

        return trailer;

    }


    const {
        filePath,
        fileSize,
        contentType
    } = trailer;


    /*----------------------------------------------
        Full Trailer
    ----------------------------------------------*/

    if (!range) {

        return {

            found: true,

            filePath,

            fileSize,

            contentType,

            status: 200

        };

    }


    /*----------------------------------------------
        Parse Range Header
    ----------------------------------------------*/

    const rangeValue =
        range.replace(
            /bytes=/,
            ""
        );


    const rangeParts =
        rangeValue.split("-");


    let start =
        parseInt(
            rangeParts[0],
            10
        );


    const requestedEnd =
        rangeParts[1] ?
        parseInt(
            rangeParts[1],
            10
        ) :
        null;


    /*----------------------------------------------
        Handle Suffix Range

        Example:

        bytes=-500

        means last 500 bytes.
    ----------------------------------------------*/

    if (Number.isNaN(start)) {

        if (
            requestedEnd === null ||
            Number.isNaN(requestedEnd) ||
            requestedEnd <= 0
        ) {

            return {

                found: true,

                invalidRange: true,

                fileSize

            };

        }


        const suffixLength =
            Math.min(
                requestedEnd,
                fileSize
            );


        start =
            fileSize -
            suffixLength;

    }


    /*----------------------------------------------
        Chunk Size
    ----------------------------------------------*/

    const CHUNK_SIZE =
        1024 * 1024;


    /*----------------------------------------------
        Calculate End
    ----------------------------------------------*/

    let end;


    if (
        requestedEnd !== null &&
        !Number.isNaN(requestedEnd)
    ) {

        end =
            Math.min(
                requestedEnd,
                fileSize - 1
            );

    } else {

        end =
            Math.min(
                start +
                CHUNK_SIZE -
                1,

                fileSize - 1
            );

    }


    /*----------------------------------------------
        Validate Range
    ----------------------------------------------*/

    if (

        start < 0 ||

        start >= fileSize ||

        end < start

    ) {

        console.error(
            "Trailer service: Invalid range:",
            range
        );

        return {

            found: true,

            invalidRange: true,

            fileSize

        };

    }


    /*----------------------------------------------
        Content Length
    ----------------------------------------------*/

    const contentLength =
        end -
        start +
        1;


    /*----------------------------------------------
        Return Partial Stream
    ----------------------------------------------*/

    return {

        found: true,

        filePath,

        fileSize,

        contentType,

        start,

        end,

        contentLength,

        status: 206

    };

}