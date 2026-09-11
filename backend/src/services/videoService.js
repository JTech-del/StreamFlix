"use strict";

/*==================================================
    StreamFlix

    Video Service

    Responsibility

    ✓ Resolve movie video files
    ✓ Resolve upcoming cinema trailer files
    ✓ Validate video files
    ✓ Handle HTTP range requests
    ✓ Determine video content type
    ✓ Keep physical media paths controlled
      by the backend

    Storage Structure

    backend/
        storage/
            trailers/
            videos/

    Does NOT handle

    ✗ HTTP responses
    ✗ Express routes
    ✗ DOM
    ✗ Frontend state
    ✗ Mini Theatre
==================================================*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMovieById } from "./movieService.js";


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

    __dirname:

    backend/src/services

    ../../

    backend/
==================================================*/

const BACKEND_ROOT = path.resolve(
    __dirname,
    "../.."
);


/*==================================================
    Video Storage Directories
==================================================*/

const VIDEO_DIRECTORIES = Object.freeze({

    movie: path.join(
        BACKEND_ROOT,
        "storage",
        "videos"
    ),

    trailer: path.join(
        BACKEND_ROOT,
        "storage",
        "trailers"
    )

});


/*==================================================
    Supported Video Types
==================================================*/

const VIDEO_TYPES = Object.freeze({

    ".mp4": "video/mp4",

    ".webm": "video/webm",

    ".mkv": "video/x-matroska"

});


/*==================================================
    Validate Video Type
==================================================*/

function isValidVideoType(type) {

    return Object.prototype.hasOwnProperty.call(
        VIDEO_DIRECTORIES,
        type
    );

}


/*==================================================
    Get Content Type
==================================================*/

function getContentType(filePath) {

    const extension =
        path.extname(filePath)
        .toLowerCase();

    return VIDEO_TYPES[extension] || null;

}


/*==================================================
    Validate Filename
==================================================*/

function getSafeFilename(fileName) {

    if (!fileName ||
        typeof fileName !== "string"
    ) {

        return null;

    }


    const safeFilename =
        path.basename(fileName);


    /*
        Prevent path traversal.

        Example of rejected values:

        ../movie-001.mp4
        ../../storage/movie.mp4
        C:\some\other\file.mp4
    */

    if (
        safeFilename !== fileName
    ) {

        return null;

    }


    return safeFilename;

}


/*==================================================
    Resolve Video File
==================================================*/

function resolveVideoFile(
    fileName,
    type
) {

    /*----------------------------------------------
        Validate Type
    ----------------------------------------------*/

    if (!isValidVideoType(type)) {

        console.error(
            `Video service: Unsupported video type "${type}".`
        );

        return null;

    }


    /*----------------------------------------------
        Validate Filename
    ----------------------------------------------*/

    const safeFilename =
        getSafeFilename(fileName);


    if (!safeFilename) {

        console.error(
            "Video service: Invalid video filename:",
            fileName
        );

        return null;

    }


    /*----------------------------------------------
        Build Physical Path
    ----------------------------------------------*/

    const videoDirectory =
        VIDEO_DIRECTORIES[type];


    const videoPath =
        path.join(
            videoDirectory,
            safeFilename
        );


    /*----------------------------------------------
        Validate Extension
    ----------------------------------------------*/

    const contentType =
        getContentType(videoPath);


    if (!contentType) {

        console.error(
            "Video service: Unsupported video extension:",
            videoPath
        );

        return null;

    }


    /*----------------------------------------------
        Validate Physical File
    ----------------------------------------------*/

    if (!fs.existsSync(videoPath)) {

        console.error(
            "Video service: Video file not found:",
            videoPath
        );

        return null;

    }


    /*----------------------------------------------
        Validate File
    ----------------------------------------------*/

    const stats =
        fs.statSync(videoPath);


    if (!stats.isFile()) {

        console.error(
            "Video service: Path is not a file:",
            videoPath
        );

        return null;

    }


    return {

        filePath: videoPath,

        fileSize: stats.size,

        contentType

    };

}


/*==================================================
    Create Video Stream Information
==================================================*/

function createStreamInformation(
    videoFile,
    range
) {

    const {
        filePath,
        fileSize,
        contentType
    } = videoFile;


    /*----------------------------------------------
        No Range

        Browser requested the complete file.
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
        Parse Range
    ----------------------------------------------*/

    const rangeParts =
        range
        .replace(/bytes=/, "")
        .split("-");


    const start =
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
        Validate Start
    ----------------------------------------------*/

    if (
        Number.isNaN(start) ||
        start < 0 ||
        start >= fileSize
    ) {

        return {

            found: true,

            invalidRange: true,

            fileSize

        };

    }


    /*----------------------------------------------
        Maximum Chunk Size

        1 MB per request.
    ----------------------------------------------*/

    const CHUNK_SIZE =
        1024 * 1024;


    /*----------------------------------------------
        Calculate End
    ----------------------------------------------*/

    const end =
        requestedEnd !== null

        ?

        Math.min(
            requestedEnd,
            fileSize - 1
        )

    :

    Math.min(
        start + CHUNK_SIZE - 1,
        fileSize - 1
    );


    /*----------------------------------------------
        Validate End
    ----------------------------------------------*/

    if (
        end < start
    ) {

        return {

            found: true,

            invalidRange: true,

            fileSize

        };

    }


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

        contentLength: end - start + 1,

        status: 206

    };

}


/*==================================================
    Get Movie Video Stream
==================================================*/

export async function getVideoStream(
    movieId,
    range
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
            `Video service: Movie ${movieId} not found.`
        );

        return {

            found: false

        };

    }


    /*----------------------------------------------
        Validate Movie Video
    ----------------------------------------------*/

    if (!movie.video) {

        console.error(
            `Video service: Movie ${movieId} has no video.`
        );

        return {

            found: false

        };

    }


    /*----------------------------------------------
        Resolve Movie Video
    ----------------------------------------------*/

    const videoFile =
        resolveVideoFile(
            movie.video,
            "movie"
        );


    if (!videoFile) {

        return {

            found: false

        };

    }


    console.log(
        `Video service [movie ${movieId}]:`,
        videoFile.filePath
    );


    /*----------------------------------------------
        Create Stream Information
    ----------------------------------------------*/

    return createStreamInformation(
        videoFile,
        range
    );

}


/*==================================================
    Get Trailer Stream
==================================================*/

export async function getTrailerStream(
    movieId,
    range
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
            `Video service: Movie ${movieId} not found.`
        );

        return {

            found: false

        };

    }


    /*----------------------------------------------
        Validate Trailer
    ----------------------------------------------*/

    if (!movie.trailer) {

        console.error(
            `Video service: Movie ${movieId} has no trailer.`
        );

        return {

            found: false

        };

    }


    /*----------------------------------------------
        Resolve Trailer
    ----------------------------------------------*/

    const trailerFile =
        resolveVideoFile(
            movie.trailer,
            "trailer"
        );


    if (!trailerFile) {

        return {

            found: false

        };

    }


    console.log(
        `Video service [trailer ${movieId}]:`,
        trailerFile.filePath
    );


    /*----------------------------------------------
        Create Stream Information
    ----------------------------------------------*/

    return createStreamInformation(
        trailerFile,
        range
    );

}