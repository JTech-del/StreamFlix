"use strict";

/*==================================================
    StreamFlix

    Movie Service

    Responsibility:

    ✓ Read movies from MongoDB
    ✓ Find movie by numeric ID
    ✓ Find movie by slug
    ✓ Return frontend-compatible movie objects
    ✓ Keep MongoDB as the source of truth

    Does NOT handle:

    ✗ HTTP responses
    ✗ Express routes
    ✗ Video streaming
    ✗ Image streaming
    ✗ Frontend state
==================================================*/

import Movie from "../models/Movie.js";


/*==================================================
    Normalize Movie

    MongoDB stores media under:

        movie.media

    Existing StreamFlix services currently expect:

        movie.video
        movie.trailer
        movie.poster
        movie.backdrop
        movie.background
        movie.logo

    This normalization preserves the existing
    application contract while MongoDB remains
    the source of truth.
==================================================*/

function normalizeMovie(movie) {

    if (!movie) {
        return null;
    }

    const media = movie.media || {};

    return {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        description: movie.description,
        year: movie.year,
        duration: movie.duration,
        rating: movie.rating,
        imdb: movie.imdb ?? null,
        quality: movie.quality || "HD",
        
                genres: Array.isArray(movie.genres)
            ? movie.genres
            : [],

        /*
        --------------------------------------------
            External Metadata
        --------------------------------------------
        */

        external: {
            tmdbId: movie.external?.tmdbId ?? null,
            tmdbRating: movie.external?.tmdbRating ?? null,
            imdbId: movie.external?.imdbId ?? null
        },

        featured: Boolean(movie.featured),

        upcoming: Boolean(movie.upcoming),

        releaseDate: movie.releaseDate || null,

        status: movie.status,

        /*
        --------------------------------------------
            Media compatibility layer
        --------------------------------------------
        */

        video: media.video || null,
        trailer: media.trailer || null,

        poster: media.poster || null,
        backdrop: media.backdrop || null,
        background: media.background || null,
        logo: media.logo || null,

        /*
        --------------------------------------------
            MongoDB metadata
        --------------------------------------------
        */

        createdAt: movie.createdAt,
        updatedAt: movie.updatedAt
    };
}


/*==================================================
    Get All Published Movies

    Production rule:

        Frontend should not receive draft or
        archived movies.

    MongoDB is now the source of truth.
==================================================*/

export async function getMovies() {

    const movies = await Movie
        .find({
            status: "published"
        })
        .sort({
            id: 1
        })
        .lean();

    return movies.map(normalizeMovie);
}


/*==================================================
    Get Movie By Numeric ID
==================================================*/

export async function getMovieById(movieId) {

    const numericId = Number(movieId);

    if (!Number.isInteger(numericId) || numericId < 1) {
        return null;
    }

    const movie = await Movie
        .findOne({
            id: numericId,
            status: "published"
        })
        .lean();

    return normalizeMovie(movie);
}


/*==================================================
    Get Movie By Slug
==================================================*/

export async function getMovieBySlug(slug) {

    if (
        !slug ||
        typeof slug !== "string"
    ) {
        return null;
    }

    const movie = await Movie
        .findOne({
            slug: slug.trim().toLowerCase(),
            status: "published"
        })
        .lean();

    return normalizeMovie(movie);
}