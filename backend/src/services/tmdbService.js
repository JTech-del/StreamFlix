"use strict";

import config from "../config/config.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbRequest(endpoint, options = {}) {
    if (!config.tmdb.apiKey) {
        throw new Error("TMDB_API_KEY is not configured.");
    }

    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${encodeURIComponent(
        config.tmdb.apiKey
    )}`;

    const response = await fetch(url, {
        ...options,
     headers: {
    Accept: "application/json",
    "User-Agent": "StreamFlix/1.0",
    ...options.headers
} 
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(`TMDB returned an invalid response (${response.status}).`);
    }

    if (!response.ok) {
        const message =
            data?.status_message ||
            `TMDB request failed with status ${response.status}.`;

        throw new Error(message);
    }

    return data;
}

export async function searchMovies(query, page = 1) {
    if (!query || typeof query !== "string" || !query.trim()) {
        throw new Error("Movie search query is required.");
    }

    const params = new URLSearchParams({
        query: query.trim(),
        page: String(page)
    });

    return tmdbRequest(`/search/movie?${params.toString()}`);
}

export async function getTmdbMovie(movieId) {
    if (!movieId) {
        throw new Error("TMDB movie ID is required.");
    }

    return tmdbRequest(`/movie/${encodeURIComponent(movieId)}`);
}

export async function getTmdbMovieVideos(movieId) {
    if (!movieId) {
        throw new Error("TMDB movie ID is required.");
    }

    return tmdbRequest(`/movie/${encodeURIComponent(movieId)}/videos`);
}