"use strict";

import Movie from "../models/Movie.js";

const MOVIE_STATUSES = new Set([
    "draft",
    "published",
    "archived"
]);

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBooleanFilter(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    const error = new Error(
        `Invalid ${fieldName} value. Expected true or false.`
    );

    error.code = "INVALID_BOOLEAN_FILTER";

    throw error;
}

function normalizeAdminMovie(movie) {
    if (!movie) return null;

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
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        external: {
            tmdbId: movie.external?.tmdbId ?? null,
            tmdbRating: movie.external?.tmdbRating ?? null,
            imdbId: movie.external?.imdbId ?? null
        },
        featured: Boolean(movie.featured),
        upcoming: Boolean(movie.upcoming),
        releaseDate: movie.releaseDate || null,
        status: movie.status,
        media: {
            video: media.video || null,
            trailer: media.trailer || null,
            poster: media.poster || null,
            backdrop: media.backdrop || null,
            background: media.background || null,
            logo: media.logo || null
        },
        createdAt: movie.createdAt,
        updatedAt: movie.updatedAt
    };
}

export async function getAdminMovies(filters = {}) {
    const {
        status,
        featured,
        upcoming,
        search,
        page = 1,
        limit = 20
    } = filters;

    const query = {};

    if (status !== undefined) {
        if (
            typeof status !== "string" ||
            !MOVIE_STATUSES.has(status.trim().toLowerCase())
        ) {
            const error = new Error("Invalid movie status.");
            error.code = "INVALID_MOVIE_STATUS";
            throw error;
        }

        query.status = status.trim().toLowerCase();
    }

    const featuredFilter = parseBooleanFilter(
        featured,
        "featured"
    );

    if (featuredFilter !== undefined) {
        query.featured = featuredFilter;
    }

    const upcomingFilter = parseBooleanFilter(
        upcoming,
        "upcoming"
    );

    if (upcomingFilter !== undefined) {
        query.upcoming = upcomingFilter;
    }

    if (search !== undefined) {
        if (
            typeof search !== "string" ||
            !search.trim()
        ) {
            const error = new Error(
                "Search must be a non-empty string."
            );

            error.code = "INVALID_SEARCH";

            throw error;
        }

        const normalizedSearch = escapeRegex(
            search.trim()
        );

        query.$or = [
            {
                title: {
                    $regex: normalizedSearch,
                    $options: "i"
                }
            },
            {
                slug: {
                    $regex: normalizedSearch,
                    $options: "i"
                }
            }
        ];
    }

    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
        Movie
            .find(query)
            .sort({ id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Movie.countDocuments(query)
    ]);

    const totalPages = total === 0
        ? 0
        : Math.ceil(total / limit);

    return {
        movies: movies.map(normalizeAdminMovie),
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    };
}

export async function getAdminMovieById(movieId) {
    const numericMovieId = Number(movieId);

    if (
        !Number.isInteger(numericMovieId) ||
        numericMovieId < 1
    ) {
        const error = new Error("Invalid movie ID.");
        error.code = "INVALID_MOVIE_ID";
        throw error;
    }

    const movie = await Movie
        .findOne({
            id: numericMovieId
        })
        .lean();

    if (!movie) {
        const error = new Error("Movie not found.");
        error.code = "MOVIE_NOT_FOUND";
        throw error;
    }

    return normalizeAdminMovie(movie);
}
