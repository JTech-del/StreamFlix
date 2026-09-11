"use strict";

/*==================================================
    StreamFlix

    Upcoming Cinema Controller

    Responsibility:

    ✓ Initialize Upcoming Cinema
    ✓ Load upcoming movies
    ✓ Track active movie
    ✓ Render active movie
    ✓ Provide upcoming movies to Trailer Rail
    ✓ Receive Watch Trailer events
    ✓ Resolve trailer URL from normalized movie
    ✓ Publish trailer selection
    ✓ Handle Trailer Rail navigation
    ✓ Bridge Trailer Rail → Mini Theatre
    ✓ Keep trailer playback orchestration separate

    Does NOT handle:

    ✗ Physical trailer paths
    ✗ Backend storage
    ✗ Trailer file resolution
    ✗ HTTP requests
    ✗ Mini Theatre implementation
    ✗ DOM rendering
==================================================*/


/*==================================================
    Movie Service
==================================================*/

import {
    loadMovies
} from "../../services/movieService.js";


/*==================================================
    Upcoming Cinema View
==================================================*/

import {
    upcomingCinemaView
} from "./upcomingCinemaView.js";


/*==================================================
    Upcoming Cinema Events
==================================================*/

import {
    upcomingCinemaEvents
} from "./upcomingCinemaEvents.js";


import {
    UpcomingCinemaEventTypes
} from "./upcomingCinemaEventTypes.js";


/*==================================================
    Mini Theatre
==================================================*/

import {
    miniTheatreController
} from "../miniTheatre/miniTheatreController.js";


/*==================================================
    Trailer Rail Events
==================================================*/

import {
    trailerRailEvents
} from "./trailerRail/trailerRailEvents.js";


import {
    TrailerRailEventTypes
} from "./trailerRail/trailerRailEventTypes.js";


/*==================================================
    Upcoming Cinema Controller
==================================================*/

class UpcomingCinemaController {


    constructor() {

        /*------------------------------------------
            Controller State
        ------------------------------------------*/

        this.movies = [];

        this.upcomingMovies = [];

        this.activeMovie = null;

        this.initialized = false;


        /*------------------------------------------
            Trailer Rotation
        ------------------------------------------*/

        this.rotationTimer = null;

        this.rotationInterval = 200000;


        /*------------------------------------------
            Bind Upcoming Cinema Handlers
        ------------------------------------------*/

        this.handleWatchTrailer =
            this.handleWatchTrailer.bind(this);


        this.handleTrailerNext =
            this.handleTrailerNext.bind(this);


        this.handleTrailerPrevious =
            this.handleTrailerPrevious.bind(this);


        /*------------------------------------------
            Bind Trailer Rail Handlers

            IMPORTANT:

            These names must match the methods
            defined below.
        ------------------------------------------*/

        this.handleTrailerRailWatchTrailer =
            this.handleTrailerRailWatchTrailer.bind(this);


        this.handleTrailerRailNext =
            this.handleTrailerRailNext.bind(this);


        this.handleTrailerRailPrevious =
            this.handleTrailerRailPrevious.bind(this);

    }


    /*==================================================
        Initialize
    ==================================================*/

    async init() {

        console.log(
            "UpcomingCinemaController.init"
        );


        /*------------------------------------------
            Prevent Duplicate Initialization
        ------------------------------------------*/

        if (this.initialized) {

            console.warn(
                "Upcoming Cinema is already initialized."
            );

            return;

        }


        try {

            /*--------------------------------------
                Load Movies
            --------------------------------------*/

            this.movies =
                await loadMovies();


            /*--------------------------------------
                Validate Movies
            --------------------------------------*/

            if (!Array.isArray(this.movies)) {

                console.error(
                    "Upcoming Cinema: Invalid movie data."
                );

                return;

            }


            /*--------------------------------------
                Filter Upcoming Movies
            --------------------------------------*/

            this.upcomingMovies =
                this.movies.filter(

                    movie =>
                    movie.upcoming === true

                );


            /*--------------------------------------
                No Upcoming Movies
            --------------------------------------*/

            if (!this.upcomingMovies.length) {

                console.warn(
                    "Upcoming Cinema: No upcoming movies found."
                );


                upcomingCinemaView.init();


                upcomingCinemaView.render(
                    null, []
                );


                this.initialized = true;

                return;

            }


            /*--------------------------------------
                Set Initial Movie
            --------------------------------------*/

            this.activeMovie =
                this.upcomingMovies[0];


            /*--------------------------------------
                Initialize View
            --------------------------------------*/

            upcomingCinemaView.init();


            /*--------------------------------------
                Bind Events
            --------------------------------------*/

            this.bindEvents();


            /*--------------------------------------
                Initial Render
            --------------------------------------*/

            this.render();


            /*--------------------------------------
                Start Trailer Rotation
            --------------------------------------*/

            this.startTrailerRotation();


            this.initialized = true;


            console.log(
                "Upcoming Cinema initialized."
            );


        } catch (error) {

            console.error(

                "Upcoming Cinema initialization failed:",

                error

            );

        }

    }


    /*==================================================
        Render
    ==================================================*/

    render() {

        if (!this.activeMovie) {

            console.warn(
                "Upcoming Cinema: No active movie to render."
            );

            return;

        }


        upcomingCinemaView.render(

            this.activeMovie,

            this.upcomingMovies

        );

    }


    /*==================================================
        Bind Events
    ==================================================*/

    bindEvents() {

        /*------------------------------------------
            Remove Existing Upcoming Cinema
            Listeners Registered By This Controller
        ------------------------------------------*/

        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.WATCH_TRAILER,

            this.handleWatchTrailer

        );


        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.TRAILER_NEXT,

            this.handleTrailerNext

        );


        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.TRAILER_PREVIOUS,

            this.handleTrailerPrevious

        );


        /*------------------------------------------
            Remove Existing Trailer Rail
            Bridge Listeners
        ------------------------------------------*/

        trailerRailEvents.off(

            TrailerRailEventTypes.WATCH_TRAILER,

            this.handleTrailerRailWatchTrailer

        );


        trailerRailEvents.off(

            TrailerRailEventTypes.NEXT,

            this.handleTrailerRailNext

        );


        trailerRailEvents.off(

            TrailerRailEventTypes.PREVIOUS,

            this.handleTrailerRailPrevious

        );


        /*------------------------------------------
            Upcoming Cinema → Watch Trailer
        ------------------------------------------*/

        upcomingCinemaEvents.on(

            UpcomingCinemaEventTypes.WATCH_TRAILER,

            this.handleWatchTrailer

        );


        /*------------------------------------------
            Upcoming Cinema → Next
        ------------------------------------------*/

        upcomingCinemaEvents.on(

            UpcomingCinemaEventTypes.TRAILER_NEXT,

            this.handleTrailerNext

        );


        /*------------------------------------------
            Upcoming Cinema → Previous
        ------------------------------------------*/

        upcomingCinemaEvents.on(

            UpcomingCinemaEventTypes.TRAILER_PREVIOUS,

            this.handleTrailerPrevious

        );


        /*------------------------------------------
            Trailer Rail → Watch Trailer
        ------------------------------------------*/

        trailerRailEvents.on(

            TrailerRailEventTypes.WATCH_TRAILER,

            this.handleTrailerRailWatchTrailer

        );


        /*------------------------------------------
            Trailer Rail → Next
        ------------------------------------------*/

        trailerRailEvents.on(

            TrailerRailEventTypes.NEXT,

            this.handleTrailerRailNext

        );


        /*------------------------------------------
            Trailer Rail → Previous
        ------------------------------------------*/

        trailerRailEvents.on(

            TrailerRailEventTypes.PREVIOUS,

            this.handleTrailerRailPrevious

        );


        console.log(
            "Upcoming Cinema event bindings established."
        );

    }


    /*==================================================
        Handle Upcoming Cinema Watch Trailer
    ==================================================*/

    handleWatchTrailer({

        movie

    } = {}) {

        if (!movie) {

            console.warn(
                "Upcoming Cinema: " +
                "Watch Trailer event contains no movie."
            );

            return;

        }


        /*------------------------------------------
            Existing Working Flow

            DO NOT CHANGE.

            This is the path already used by the
            Upcoming Cinema preview Watch Trailer
            button.
        ------------------------------------------*/

        this.handleTrailerSelection(
            movie
        );

    }


    /*==================================================
        Handle Trailer Rail Watch Trailer
    ==================================================*/

    handleTrailerRailWatchTrailer({

        movie

    } = {}) {

        if (!movie) {

            console.warn(
                "Upcoming Cinema: " +
                "Trailer Rail Watch Trailer event " +
                "contains no movie."
            );

            return;

        }


        console.log(

            "Upcoming Cinema ← Trailer Rail: " +
            "Watch Trailer",

            movie.title

        );


        /*------------------------------------------
            Keep Upcoming Cinema State Correct
        ------------------------------------------*/

        this.activeMovie =
            movie;


        /*------------------------------------------
            Validate Trailer
        ------------------------------------------*/

        if (!movie.trailerUrl) {

            console.warn(

                "Upcoming Cinema: " +
                "Trailer Rail movie has no trailer URL.",

                movie

            );

            return;

        }


        /*------------------------------------------
            IMPORTANT

            Do NOT wait for Upcoming Cinema to
            rotate or render before opening the
            Mini Theatre.

            The user explicitly clicked the
            Trailer Rail Watch Trailer button.

            Open the Mini Theatre immediately.
        ------------------------------------------*/

        this.openTrailerInMiniTheatre(
            movie
        );


        /*------------------------------------------
            Publish Existing Trailer Selection

            This keeps the existing Upcoming Cinema
            event architecture intact.
        ------------------------------------------*/

        upcomingCinemaEvents.emit(

            UpcomingCinemaEventTypes.TRAILER_SELECTED,

            {

                movie,

                trailer: movie.trailerUrl

            }

        );

    }


    /*==================================================
        Handle Trailer Rail Next
    ==================================================*/

    handleTrailerRailNext() {

        this.showNextTrailer();

    }


    /*==================================================
        Handle Trailer Rail Previous
    ==================================================*/

    handleTrailerRailPrevious() {

        this.showPreviousTrailer();

    }


    /*==================================================
        Handle Trailer Selection
    ==================================================*/

    handleTrailerSelection(movie) {

        if (!movie) {

            return;

        }


        /*------------------------------------------
            Update Active Movie
        ------------------------------------------*/

        this.activeMovie =
            movie;


        /*------------------------------------------
            Validate Trailer
        ------------------------------------------*/

        if (!movie.trailerUrl) {

            console.warn(

                `Upcoming Cinema: ` +
                `No trailer available for movie ${movie.id}.`

            );

            return;

        }


        console.log(

            "Upcoming Cinema → Trailer Selected:",

            movie.title

        );


        /*------------------------------------------
            Existing Preview Flow

            This remains untouched.

            The Upcoming Cinema preview Watch
            Trailer button already works through
            this path.
        ------------------------------------------*/

        this.openTrailerInMiniTheatre(
            movie
        );


        /*------------------------------------------
            Publish Trailer Selection
        ------------------------------------------*/

        upcomingCinemaEvents.emit(

            UpcomingCinemaEventTypes.TRAILER_SELECTED,

            {

                movie,

                trailer: movie.trailerUrl

            }

        );

    }


    /*==================================================
        Open Trailer In Mini Theatre
    ==================================================*/

    openTrailerInMiniTheatre(movie) {

        if (!movie) {

            console.warn(

                "Upcoming Cinema: " +
                "Cannot open Mini Theatre without a movie."

            );

            return false;

        }


        /*------------------------------------------
            Validate Mini Theatre Controller
        ------------------------------------------*/

        if (!miniTheatreController) {

            console.warn(

                "Upcoming Cinema: " +
                "Mini Theatre Controller unavailable."

            );

            return false;

        }


        /*------------------------------------------
            Prefer Controller-Level Play API
        ------------------------------------------*/

        if (
            typeof miniTheatreController.play ===
            "function"
        ) {

            console.log(

                "Upcoming Cinema → Mini Theatre:",

                movie.title

            );


            miniTheatreController.play(
                movie
            );


            return true;

        }


        /*------------------------------------------
            Fallback

            If the active Mini Theatre controller
            exposes playback through another public
            method, do not silently fail.
        ------------------------------------------*/

        console.warn(

            "Upcoming Cinema: " +
            "Mini Theatre Controller does not expose play(movie)."

        );


        return false;

    }


    /*==================================================
        Set Active Movie
    ==================================================*/

    setActiveMovie(movie) {

        if (!movie) {

            return;

        }


        this.activeMovie =
            movie;


        this.render();

    }


    /*==================================================
        Get Active Movie
    ==================================================*/

    getActiveMovie() {

        return this.activeMovie;

    }


    /*==================================================
        Get Upcoming Movies
    ==================================================*/

    getUpcomingMovies() {

        return this.upcomingMovies;

    }


    /*==================================================
        Has Trailer
    ==================================================*/

    hasTrailer(movie) {

        if (!movie) {

            return false;

        }


        return Boolean(
            movie.trailerUrl
        );

    }


    /*==================================================
        Get Active Movie Index
    ==================================================*/

    getActiveMovieIndex() {

        if (!this.activeMovie) {

            return -1;

        }


        return this.upcomingMovies.findIndex(

            movie =>

            String(movie.id) ===
            String(this.activeMovie.id)

        );

    }


    /*==================================================
        Show Next Trailer
    ==================================================*/

    showNextTrailer() {

        if (!this.upcomingMovies.length) {

            return;

        }


        const currentIndex =

            this.upcomingMovies.findIndex(

                movie =>

                this.activeMovie &&

                String(movie.id) ===
                String(this.activeMovie.id)

            );


        const nextIndex =

            currentIndex === -1

            ?

            0

            :

            (

                currentIndex + 1

            ) %

            this.upcomingMovies.length;


        this.activeMovie =

            this.upcomingMovies[
                nextIndex
            ];


        console.log(

            "Upcoming Cinema → Next Trailer:",

            this.activeMovie.title

        );


        this.render();


        /*------------------------------------------
            Start New Background Preview
        ------------------------------------------*/

        requestAnimationFrame(() => {

            upcomingCinemaView.playPreview();

        });

    }


    /*==================================================
        Show Previous Trailer
    ==================================================*/

    showPreviousTrailer() {

        if (!this.upcomingMovies.length) {

            return;

        }


        const currentIndex =

            this.upcomingMovies.findIndex(

                movie =>

                this.activeMovie &&

                String(movie.id) ===
                String(this.activeMovie.id)

            );


        const previousIndex =

            currentIndex === -1

            ?

            this.upcomingMovies.length - 1

            :

            (

                currentIndex - 1 +

                this.upcomingMovies.length

            ) %

            this.upcomingMovies.length;


        this.activeMovie =

            this.upcomingMovies[
                previousIndex
            ];


        console.log(

            "Upcoming Cinema → Previous Trailer:",

            this.activeMovie.title

        );


        this.render();


        /*------------------------------------------
            Start New Background Preview
        ------------------------------------------*/

        requestAnimationFrame(() => {

            upcomingCinemaView.playPreview();

        });

    }


    /*==================================================
        Handle Upcoming Cinema Next
    ==================================================*/

    handleTrailerNext() {

        this.showNextTrailer();

    }


    /*==================================================
        Handle Upcoming Cinema Previous
    ==================================================*/

    handleTrailerPrevious() {

        this.showPreviousTrailer();

    }


    /*==================================================
        Start Trailer Rotation
    ==================================================*/

    startTrailerRotation() {

        this.stopTrailerRotation();


        if (
            this.upcomingMovies.length <= 1
        ) {

            return;

        }


        this.rotationTimer =

            setInterval(

                () => {

                    this.showNextTrailer();

                },

                this.rotationInterval

            );


        console.log(

            "Upcoming Cinema trailer rotation started."

        );

    }


    /*==================================================
        Stop Trailer Rotation
    ==================================================*/

    stopTrailerRotation() {

        if (!this.rotationTimer) {

            return;

        }


        clearInterval(
            this.rotationTimer
        );


        this.rotationTimer =
            null;


        console.log(

            "Upcoming Cinema trailer rotation stopped."

        );

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        /*------------------------------------------
            Stop Rotation
        ------------------------------------------*/

        this.stopTrailerRotation();


        /*------------------------------------------
            Remove Upcoming Cinema Listeners
        ------------------------------------------*/

        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.WATCH_TRAILER,

            this.handleWatchTrailer

        );


        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.TRAILER_NEXT,

            this.handleTrailerNext

        );


        upcomingCinemaEvents.off(

            UpcomingCinemaEventTypes.TRAILER_PREVIOUS,

            this.handleTrailerPrevious

        );


        /*------------------------------------------
            Remove Trailer Rail Event Bridge
        ------------------------------------------*/

        trailerRailEvents.off(

            TrailerRailEventTypes.WATCH_TRAILER,

            this.handleTrailerRailWatchTrailer

        );


        trailerRailEvents.off(

            TrailerRailEventTypes.NEXT,

            this.handleTrailerRailNext

        );


        trailerRailEvents.off(

            TrailerRailEventTypes.PREVIOUS,

            this.handleTrailerRailPrevious

        );


        /*------------------------------------------
            Destroy View
        ------------------------------------------*/

        upcomingCinemaView.destroy();


        /*------------------------------------------
            Reset Controller State
        ------------------------------------------*/

        this.movies = [];

        this.upcomingMovies = [];

        this.activeMovie = null;

        this.initialized = false;

    }

}


/*==================================================
    Singleton
==================================================*/

export const upcomingCinemaController =

    new UpcomingCinemaController();