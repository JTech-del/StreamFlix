"use strict";

/*==================================================
    StreamFlix

    Image Service

    Responsibility:

    ✓ Resolve movie images
    ✓ Resolve physical image paths
    ✓ Validate image files
    ✓ Determine image content type
    ✓ Keep physical image paths controlled
      by the backend

    Does NOT handle:

    ✗ HTTP responses
    ✗ Express routes
    ✗ DOM
    ✗ Frontend state
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

const __filename =
    fileURLToPath(
        import.meta.url);

const __dirname =
    path.dirname(__filename);


/*==================================================
    Backend Root

    backend/
        src/
            services/

    ../../
        backend/
==================================================*/

const BACKEND_ROOT =
    path.resolve(
        __dirname,
        "../.."
    );


/*==================================================
    Image Directory

    Physical image storage:

    backend/
        storage/
            poster/
==================================================*/

const IMAGE_DIRECTORY =
    path.join(
        BACKEND_ROOT,
        "storage",
        "poster"
    );


/*==================================================
    Supported Image Types
==================================================*/

const IMAGE_TYPES =
    Object.freeze({

        ".jpg": "image/jpeg",

        ".jpeg": "image/jpeg",

        ".png": "image/png",

        ".webp": "image/webp"

    });


/*==================================================
    Get Content Type
==================================================*/

function getContentType(filePath) {

    const extension =
        path.extname(
            filePath
        ).toLowerCase();


    return (
        IMAGE_TYPES[extension] ||
        null
    );

}


/*==================================================
    Validate Filename
==================================================*/

function getSafeFilename(
    fileName
) {

    if (!fileName ||
        typeof fileName !== "string"
    ) {

        return null;

    }


    const safeFileName =
        path.basename(
            fileName
        );


    /*
        Prevent path traversal.

        Rejected:

        ../image.jpg
        ../../image.jpg
        C:\images\image.jpg
    */

    if (
        safeFileName !== fileName
    ) {

        return null;

    }


    return safeFileName;

}


/*==================================================
    Resolve Movie Image
==================================================*/

export async function getMovieImage(
    movieId,
    type = "poster"
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
            `Image service: Movie ${movieId} not found.`
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Resolve Image Reference
    ----------------------------------------------*/

    let imageFileName;


    switch (type) {

        case "poster":

            imageFileName =
                movie.poster;

            break;


        case "backdrop":

            imageFileName =
                movie.backdrop;

            break;


        case "background":

            imageFileName =
                movie.background;

            break;


        case "logo":

            imageFileName =
                movie.logo;

            break;


        default:

            console.error(
                `Image service: Unsupported image type: ${type}`
            );

            return {
                found: false
            };

    }


    /*----------------------------------------------
        Validate Image Reference
    ----------------------------------------------*/

    if (!imageFileName) {

        console.error(
            `Image service: Movie ${movieId} has no ${type} image.`
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Validate Filename
    ----------------------------------------------*/

    const safeFileName =
        getSafeFilename(
            imageFileName
        );


    if (!safeFileName) {

        console.error(
            `Image service: Invalid image filename for movie ${movieId}:`,
            imageFileName
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Build Physical Path
    ----------------------------------------------*/

    const imagePath =
        path.join(
            IMAGE_DIRECTORY,
            safeFileName
        );


    const resolvedImagePath =
        path.resolve(
            imagePath
        );


    const resolvedImageDirectory =
        path.resolve(
            IMAGE_DIRECTORY
        );


    /*----------------------------------------------
        Path Traversal Protection
    ----------------------------------------------*/

    if (!resolvedImagePath.startsWith(
            resolvedImageDirectory +
            path.sep
        )) {

        console.error(
            "Image service: Invalid image path:",
            resolvedImagePath
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
            resolvedImagePath
        );


    if (!contentType) {

        console.error(
            "Image service: Unsupported image extension:",
            resolvedImagePath
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Check File
    ----------------------------------------------*/

    if (!fs.existsSync(
            resolvedImagePath
        )) {

        console.error(
            "Image service: Image file not found:",
            resolvedImagePath
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
            resolvedImagePath
        );


    if (!fileStats.isFile()) {

        console.error(
            "Image service: Path is not a file:",
            resolvedImagePath
        );

        return {
            found: false
        };

    }


    /*----------------------------------------------
        Success
    ----------------------------------------------*/

    console.log(
        `Image service: ${type}`,
        resolvedImagePath
    );


    return {

        found: true,

        filePath: resolvedImagePath,

        fileSize: fileStats.size,

        contentType

    };

}