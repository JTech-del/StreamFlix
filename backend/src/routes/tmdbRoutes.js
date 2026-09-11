import express from "express";
import {
    searchMovies,
    getTmdbMovie,
    getTmdbMovieVideos
} from "../services/tmdbService.js";

const router = express.Router();

router.get("/search", async (req, res) => {
    try {
        const { query, page = 1 } = req.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Movie search query is required."
            });
        }

        const results = await searchMovies(query, Number(page));

        const movies = results.results.map((movie) => ({
            tmdbId: movie.id,
            title: movie.title,
            originalTitle: movie.original_title,
            overview: movie.overview,
            originalLanguage: movie.original_language,
            releaseDate: movie.release_date,
            popularity: movie.popularity,
            rating: movie.vote_average,
            voteCount: movie.vote_count,
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            genreIds: movie.genre_ids
        }));

        res.json({
            success: true,
            data: {
                page: results.page,
                totalPages: results.total_pages,
                totalResults: results.total_results,
                movies
            }
        });
    } catch (error) {
        console.error("TMDB movie search failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to search TMDB."
        });
    }
});

router.get("/movies/:movieId", async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "TMDB movie ID is required."
            });
        }

        const movie = await getTmdbMovie(movieId);

        res.json({
            success: true,
            data: movie
        });
    } catch (error) {
        console.error("TMDB movie details failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve TMDB movie details."
        });
    }
});

router.get("/movies/:movieId/videos", async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "TMDB movie ID is required."
            });
        }

        const videos = await getTmdbMovieVideos(movieId);

        res.json({
            success: true,
            data: videos
        });
    } catch (error) {
        console.error("TMDB movie videos failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve TMDB movie videos."
        });
    }
});

export default router;