"use strict";

import {
    getAdminMovies,
    getAdminMovieById
} from "../services/adminMovieCatalogService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parsePaginationValue(value, defaultValue, fieldName, maxValue) {
    if (value === undefined) {
        return defaultValue;
    }

    if (
        typeof value !== "string" ||
        !/^\d+$/.test(value)
    ) {
        const error = new Error(
            `Invalid ${fieldName} value.`
        );

        error.code = "INVALID_PAGINATION";
        throw error;
    }

    const parsedValue = Number(value);

    if (
        !Number.isSafeInteger(parsedValue) ||
        parsedValue < 1 ||
        (maxValue !== undefined && parsedValue > maxValue)
    ) {
        const error = new Error(
            `Invalid ${fieldName} value.`
        );

        error.code = "INVALID_PAGINATION";
        throw error;
    }

    return parsedValue;
}

export async function getAdminMoviesController(req, res) {
    try {
        const {
            status,
            featured,
            upcoming,
            search,
            page: pageQuery,
            limit: limitQuery
        } = req.query;

        const page = parsePaginationValue(
            pageQuery,
            DEFAULT_PAGE,
            "page"
        );

        const limit = parsePaginationValue(
            limitQuery,
            DEFAULT_LIMIT,
            "limit",
            MAX_LIMIT
        );

        const result = await getAdminMovies({
            status,
            featured,
            upcoming,
            search,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            data: result.movies,
            pagination: result.pagination
        });
    } catch (error) {
        if (
            error.code === "INVALID_MOVIE_STATUS" ||
            error.code === "INVALID_BOOLEAN_FILTER" ||
            error.code === "INVALID_SEARCH" ||
            error.code === "INVALID_PAGINATION"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error(
            "Admin movie catalog retrieval failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve admin movie catalog."
        });
    }
}


export async function getAdminMovieByIdController(req, res) {
    try {
        const { movieId } = req.params;

        const movie = await getAdminMovieById(movieId);

        return res.status(200).json({
            success: true,
            data: movie
        });
    } catch (error) {
        if (error.code === "INVALID_MOVIE_ID") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "MOVIE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error(
            "Admin movie retrieval failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve admin movie."
        });
    }
}
