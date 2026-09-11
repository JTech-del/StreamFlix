"use strict";

import express from "express";

import {
    getMovies,
    getMovieById
} from "../services/movieService.js";


const router = express.Router();


/*==================================================
    API Base URL
==================================================*/

const API_BASE_URL =
    "http://localhost:5000";


/*==================================================
    Build Frontend Movie Response

    The frontend never receives physical
    storage paths.

    Movie video:
        /api/videos/:movieId

    Trailer:
        /api/trailers/:movieId

    Images:
        /api/images/:movieId/:type
==================================================*/

function buildMovieResponse(movie) {

    if (!movie) {

        return null;

    }


    return {

        ...movie,


        /*------------------------------------------
            Poster
        ------------------------------------------*/

        poster: movie.poster ?
            `${API_BASE_URL}/api/images/${movie.id}/poster` : null,


        /*------------------------------------------
            Backdrop
        ------------------------------------------*/

        backdrop: movie.backdrop ?
            `${API_BASE_URL}/api/images/${movie.id}/backdrop` : null,


        /*------------------------------------------
            Background
        ------------------------------------------*/

        background: movie.background ?
            `${API_BASE_URL}/api/images/${movie.id}/background` : null,


        /*------------------------------------------
            Logo
        ------------------------------------------*/

        logo: movie.logo ?
            `${API_BASE_URL}/api/images/${movie.id}/logo` : null,


        /*------------------------------------------
            Movie Video
        ------------------------------------------*/

        video: movie.video ?
            `${API_BASE_URL}/api/videos/${movie.id}` : null,


        /*------------------------------------------
            Trailer

            Physical filename remains private.

            Frontend receives:

            /api/trailers/:movieId
        ------------------------------------------*/

        trailerUrl: movie.trailer ?
            `${API_BASE_URL}/api/trailers/${movie.id}` : null

    };

}


/*==================================================
    Get All Movies
==================================================*/

router.get(
    "/movies",
    async(req, res) => {

        try {

            const movies =
                await getMovies();


            const response =
                movies.map(
                    movie =>
                    buildMovieResponse(movie)
                );


            return res.json({

                success: true,

                data: response

            });

        } catch (error) {

            console.error(
                "Failed to load movies:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Failed to load movies"

            });

        }

    }
);


/*==================================================
    Get Movie By ID
==================================================*/

router.get(
    "/movies/:movieId",
    async(req, res) => {

        try {

            const movie =
                await getMovieById(
                    req.params.movieId
                );


            /*--------------------------------------
                Movie Not Found
            --------------------------------------*/

            if (!movie) {

                return res.status(404).json({

                    success: false,

                    message: "Movie not found"

                });

            }


            const response =
                buildMovieResponse(movie);


            return res.json({

                success: true,

                data: response

            });

        } catch (error) {

            console.error(
                "Failed to load movie:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Failed to load movie"

            });

        }

    }
);


/*==================================================
    Export
==================================================*/

export default router;