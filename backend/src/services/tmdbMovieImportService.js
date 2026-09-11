import Movie from "../models/Movie.js";
import { getTmdbMovie } from "./tmdbService.js";

function createSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeGenres(genres) {
    if (!Array.isArray(genres)) {
        return [];
    }

    return genres
        .map((genre) => genre?.name)
        .filter(Boolean);
}

export async function importMovieFromTmdb(tmdbId) {
    if (!tmdbId) {
        throw new Error("TMDB movie ID is required.");
    }

    const movie = await getTmdbMovie(tmdbId);

    const existingMovie = await Movie.findOne({
        "external.tmdbId": movie.id
    });

    const tmdbMetadata = {
    title: movie.title,
    description: movie.overview || "",
    year: movie.release_date
        ? Number(movie.release_date.slice(0, 4))
        : null,

    duration: movie.runtime
        ? `${movie.runtime} min`
        : null,

    external: {
        tmdbId: movie.id,
        tmdbRating: movie.vote_average ?? null,
        imdbId: movie.imdb_id || null,
        tmdbGenres: normalizeGenres(movie.genres)
    },

    releaseDate: movie.release_date || null
};

    if (existingMovie) {
        existingMovie.title = tmdbMetadata.title;
        existingMovie.description = tmdbMetadata.description;
        existingMovie.year = tmdbMetadata.year;
        existingMovie.duration = tmdbMetadata.duration;
        /*
        existingMovie.genres = tmdbMetadata.genres;
        */
        existingMovie.external = tmdbMetadata.external;
        existingMovie.releaseDate = tmdbMetadata.releaseDate;

        await existingMovie.save();

        return {
            action: "updated",
            movie: existingMovie
        };
    }

    const nextMovieId = await Movie.countDocuments() + 1;

    const newMovie = await Movie.create({
        id: nextMovieId,

        slug: createSlug(movie.title),

        ...tmdbMetadata,
        genres: [],
        rating: "Not Rated",
        imdb: null,
        quality: "HD",

        media: {
            video: null,
            trailer: null,
            poster: null,
            backdrop: null,
            background: null,
            logo: null
        },

        featured: false,
        upcoming: false,
        status: "draft"
    });

    return {
        action: "created",
        movie: newMovie
    };
}