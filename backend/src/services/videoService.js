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
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    getMovieById,
    getPublishedMovieVideoReferences
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

const MAX_CACHED_MEDIA_DIGESTS = 128;
const MAX_IN_FLIGHT_MEDIA_DIGESTS = 32;
const mediaDigestCache = new Map();
const inFlightMediaDigests = new Map();
const mediaHandleClosePromises = new WeakMap();

function closeMediaHandle(fileHandle) {
    if (!fileHandle) return Promise.resolve();
    if (mediaHandleClosePromises.has(fileHandle)) {
        return mediaHandleClosePromises.get(fileHandle);
    }

    const closePromise = fileHandle.close().catch((error) => {
        if (fileHandle.fd === -1) return;
        throw error;
    });
    mediaHandleClosePromises.set(fileHandle, closePromise);
    return closePromise;
}

function getMediaIdentity(filePath, stats) {
    return [
        filePath,
        stats.dev,
        stats.ino,
        stats.size,
        stats.mtimeNs,
        stats.ctimeNs,
        stats.birthtimeNs
    ].map(String).join(":");
}

function sameMediaVersion(left, right) {
    return ["dev", "ino", "size", "mtimeNs", "ctimeNs", "birthtimeNs"]
        .every((field) => left[field] === right[field]);
}

async function assertMediaVersionIsStable(openedFile) {
    const currentStats = await openedFile.fileHandle.stat({ bigint: true });
    if (!sameMediaVersion(openedFile.stats, currentStats)) {
        throw new Error("Media file changed during integrity verification.");
    }
}

async function openMediaFile(filePath) {
    const fileHandle = await fs.promises.open(filePath, "r");
    try {
        const stats = await fileHandle.stat({ bigint: true });
        if (!stats.isFile() || stats.size <= 0n || stats.size > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("Media file is not a supported regular file.");
        }
        return {
            fileHandle,
            stats,
            fileSize: Number(stats.size),
            identity: getMediaIdentity(filePath, stats)
        };
    } catch (error) {
        await closeMediaHandle(fileHandle);
        throw error;
    }
}

async function calculateFileDigest(fileHandle, initialStats) {
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let position = 0;
    const expectedSize = Number(initialStats.size);

    while (position < expectedSize) {
        const { bytesRead } = await fileHandle.read(
            buffer,
            0,
            Math.min(buffer.length, expectedSize - position),
            position
        );
        if (bytesRead === 0) throw new Error("Media file changed during integrity verification.");
        hash.update(buffer.subarray(0, bytesRead));
        position += bytesRead;
    }

    const finalStats = await fileHandle.stat({ bigint: true });
    if (!sameMediaVersion(initialStats, finalStats)) {
        throw new Error("Media file changed during integrity verification.");
    }
    return hash.digest("hex");
}

async function getFileDigest(openedFile) {
    const { fileHandle, stats, identity } = openedFile;

    // Validate this caller's handle even when another request has
    // already calculated, or is currently calculating, the digest.
    await assertMediaVersionIsStable(openedFile);

    if (mediaDigestCache.has(identity)) {
        const digest = mediaDigestCache.get(identity);
        await assertMediaVersionIsStable(openedFile);

        mediaDigestCache.delete(identity);
        mediaDigestCache.set(identity, digest);
        return digest;
    }

    const existingDigestPromise = inFlightMediaDigests.get(identity);
    if (existingDigestPromise) {
        const digest = await existingDigestPromise;
        await assertMediaVersionIsStable(openedFile);
        return digest;
    }

    if (inFlightMediaDigests.size >= MAX_IN_FLIGHT_MEDIA_DIGESTS) {
        throw new Error("Media integrity verification is at capacity.");
    }

    let digestPromise;
    digestPromise = (async () => {
        try {
            const digest = await calculateFileDigest(fileHandle, stats);
            await assertMediaVersionIsStable(openedFile);

            mediaDigestCache.set(identity, digest);
            while (mediaDigestCache.size > MAX_CACHED_MEDIA_DIGESTS) {
                mediaDigestCache.delete(mediaDigestCache.keys().next().value);
            }

            return digest;
        } finally {
            if (inFlightMediaDigests.get(identity) === digestPromise) {
                inFlightMediaDigests.delete(identity);
            }
        }
    })();

    inFlightMediaDigests.set(identity, digestPromise);
    return digestPromise;
}

async function isFullMovieDuplicate(openedTrailer) {
    const videoReferences = await getPublishedMovieVideoReferences();
    const matchingSizeFiles = [...new Set(videoReferences)]
        .map((filename) => resolveVideoFile(filename, "movie"))
        .filter((movieFile) => movieFile?.fileSize === openedTrailer.fileSize);

    if (matchingSizeFiles.length === 0) return false;

    const trailerDigest = await getFileDigest(openedTrailer);

    for (const movieFile of matchingSizeFiles) {
        let openedMovie;
        try {
            openedMovie = await openMediaFile(movieFile.filePath);
            if (openedMovie.fileSize !== openedTrailer.fileSize) continue;
            const movieDigest = await getFileDigest(openedMovie);
            await assertMediaVersionIsStable(openedMovie);
            if (trailerDigest === movieDigest) return true;
        } finally {
            await closeMediaHandle(openedMovie?.fileHandle);
        }
    }

    return false;
}


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

        console.error("Video service: Unsupported media category.");

        return null;

    }


    /*----------------------------------------------
        Validate Filename
    ----------------------------------------------*/

    const safeFilename =
        getSafeFilename(fileName);


    if (!safeFilename) {

        console.error("Video service: Invalid media filename.");

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

        console.error("Video service: Unsupported media extension.");

        return null;

    }


    /*----------------------------------------------
        Validate Physical File
    ----------------------------------------------*/

    if (!fs.existsSync(videoPath)) {

        console.error("Video service: Media file is unavailable.");

        return null;

    }


    /*----------------------------------------------
        Validate File
    ----------------------------------------------*/

    const stats =
        fs.statSync(videoPath);


    if (!stats.isFile()) {

        console.error("Video service: Media file is unavailable.");

        return null;

    }


    return {

        filePath: videoPath,

        fileSize: stats.size,

        modifiedAt: stats.mtimeMs,

        contentType

    };

}

// Catalogue responses use this to avoid advertising missing or invalid files.
export function hasMovieVideoFile(fileName) {
    return resolveVideoFile(fileName, "movie") !== null;
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

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
        return { found: true, invalidRange: true, fileSize };
    }

    let start;
    let requestedEnd;
    if (!match[1]) {
        const suffixLength = Number(match[2]);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            return { found: true, invalidRange: true, fileSize };
        }
        start = Math.max(0, fileSize - suffixLength);
        requestedEnd = fileSize - 1;
    } else {
        start = Number(match[1]);
        requestedEnd = match[2] ? Number(match[2]) : null;
    }


    /*----------------------------------------------
        Validate Start
    ----------------------------------------------*/

    if (
        !Number.isSafeInteger(start) ||
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
    const movie = await getMovieById(movieId);

    if (!movie) {
        console.error(`Video service: Movie ${movieId} not found.`);
        return { found: false };
    }

    if (!movie.video) {
        console.error(`Video service: Movie ${movieId} has no video.`);
        return { found: false };
    }

    const videoFile = resolveVideoFile(movie.video, "movie");
    if (!videoFile) {
        return { found: false };
    }

    let openedVideo;
    try {
        openedVideo = await openMediaFile(videoFile.filePath);
        await assertMediaVersionIsStable(openedVideo);

        const streamInfo = createStreamInformation({
            ...videoFile,
            fileSize: openedVideo.fileSize
        }, range);

        if (streamInfo.invalidRange) {
            await closeMediaHandle(openedVideo.fileHandle);
            return streamInfo;
        }

        // The controller streams from this handle, not by reopening
        // the pathname after resolution.
        return {
            ...streamInfo,
            fileHandle: openedVideo.fileHandle
        };
    } catch (error) {
        await closeMediaHandle(openedVideo?.fileHandle).catch(() => {});
        throw error;
    }
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

    let openedTrailer;
    try {
        openedTrailer = await openMediaFile(trailerFile.filePath);
        if (await isFullMovieDuplicate(openedTrailer)) {
            console.warn("Video service: Refusing to serve a full-movie file as a public trailer.");
            await closeMediaHandle(openedTrailer.fileHandle);
            return { found: false };
        }

        await assertMediaVersionIsStable(openedTrailer);

        const streamInfo = createStreamInformation({
            ...trailerFile,
            fileSize: openedTrailer.fileSize
        }, range);
        if (streamInfo.invalidRange) {
            await closeMediaHandle(openedTrailer.fileHandle);
            return streamInfo;
        }

        // Keep this opened file version for the response; a path replacement
        // after verification cannot redirect the stream to different content.
        return { ...streamInfo, fileHandle: openedTrailer.fileHandle };
    } catch {
        // Fail closed if the duplicate-content check cannot complete.
        console.error("Video service: Trailer integrity verification failed.");
        await closeMediaHandle(openedTrailer?.fileHandle).catch(() => {});
        return { found: false };
    }

}
