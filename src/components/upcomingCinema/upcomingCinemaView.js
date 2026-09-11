"use strict";

/*==================================================
    StreamFlix

    Upcoming Cinema View

    Responsibility:

    ✓ Render Upcoming Cinema
    ✓ Manage existing cinematic preview
    ✓ Manage movie information
    ✓ Manage existing Watch Trailer button
    ✓ Mount Trailer Rail child component
    ✓ Pass upcoming movies to Trailer Rail
    ✓ Keep DOM rendering inside the View

    Does NOT handle:

    ✗ Backend requests
    ✗ Movie loading
    ✗ Application state
    ✗ Trailer rail business logic
    ✗ Trailer rail navigation
    ✗ Mini Theatre implementation
==================================================*/


/*==================================================
    Templates
==================================================*/

import {
    upcomingCinemaTemplates
} from "./upcomingCinemaTemplates.js";


/*==================================================
    Events
==================================================*/

import {
    upcomingCinemaEvents
} from "./upcomingCinemaEvents.js";

import {
    UpcomingCinemaEventTypes
} from "./upcomingCinemaEventTypes.js";


/*==================================================
    Trailer Rail
==================================================*/

import {
    trailerRailController
} from "./trailerRail/trailerRailController.js";


/*==================================================
    Upcoming Cinema View
==================================================*/

class UpcomingCinemaView {


    constructor() {

        this.elements = {

            /*--------------------------------------
                Existing Upcoming Cinema
            --------------------------------------*/

            mount: null,

            section: null,

            header: null,

            title: null,

            subtitle: null,

            preview: null,

            video: null,

            content: null,

            info: null,

            movieTitle: null,

            metadata: null,

            description: null,

            release: null,

            watchTrailerButton: null,


            /*--------------------------------------
                Trailer Rail Child Component
            --------------------------------------*/

            trailerRailMount: null,

            trailerRail: null

        };


        /*------------------------------------------
            View State
        ------------------------------------------*/

        this.currentMovie = null;

        this.upcomingMovies = [];


        /*------------------------------------------
            Bound Existing Watch Trailer Handler
        ------------------------------------------*/

        this.handleWatchTrailer =
            this.handleWatchTrailer.bind(this);

    }


    /*==================================================
        Initialize
    ==================================================*/

    init() {

        this.cacheMount();

    }


    /*==================================================
        Cache Mount
    ==================================================*/

    cacheMount() {

        this.elements.mount =
            document.querySelector(
                "#upcoming-cinema"
            );


        if (!this.elements.mount) {

            throw new Error(
                "Upcoming Cinema mount point " +
                "#upcoming-cinema was not found."
            );

        }

    }


    /*==================================================
        Render
    ==================================================*/

    render(
        movie = null,
        upcomingMovies = []
    ) {

        if (!this.elements.mount) {

            this.cacheMount();

        }


        /*------------------------------------------
            Stop Existing Preview
        ------------------------------------------*/

        this.resetPreview();


        /*------------------------------------------
            Remove Existing Watch Listener
        ------------------------------------------*/

        this.removeWatchTrailerListener();


        /*------------------------------------------
            Destroy Previous Trailer Rail
        ------------------------------------------*/

        this.destroyTrailerRail();


        /*------------------------------------------
            Store Current State
        ------------------------------------------*/

        this.currentMovie =
            movie;


        this.upcomingMovies =
            Array.isArray(upcomingMovies) ?
            upcomingMovies : [];


        /*------------------------------------------
            Empty State
        ------------------------------------------*/

        if (!movie) {

            this.elements.mount.innerHTML =
                upcomingCinemaTemplates.emptyState();

            this.cacheElements();

            return;

        }


        /*------------------------------------------
            Render Existing Upcoming Cinema
        ------------------------------------------*/

        this.elements.mount.innerHTML =
            upcomingCinemaTemplates.section(
                movie
            );


        /*------------------------------------------
            Cache DOM
        ------------------------------------------*/

        this.cacheElements();


        /*------------------------------------------
            Bind Existing Watch Trailer
        ------------------------------------------*/

        this.bindWatchTrailer();


        /*------------------------------------------
            Mount Trailer Rail Child
        ------------------------------------------*/

        this.mountTrailerRail();


        /*------------------------------------------
            Start Background Preview
        ------------------------------------------*/

        this.playPreview();

    }


    /*==================================================
        Cache Elements
    ==================================================*/

    cacheElements() {

        const mount =
            this.elements.mount;


        if (!mount) {

            return;

        }


        /*------------------------------------------
            Existing Upcoming Cinema
        ------------------------------------------*/

        this.elements.section =
            mount.querySelector(
                ".upcoming-cinema"
            );


        this.elements.header =
            mount.querySelector(
                ".upcoming-cinema__header"
            );


        this.elements.title =
            mount.querySelector(
                ".upcoming-cinema__title"
            );


        this.elements.subtitle =
            mount.querySelector(
                ".upcoming-cinema__subtitle"
            );


        this.elements.preview =
            mount.querySelector(
                ".upcoming-cinema__preview"
            );


        this.elements.video =
            mount.querySelector(
                ".upcoming-cinema__video"
            );


        this.elements.content =
            mount.querySelector(
                ".upcoming-cinema__content"
            );


        this.elements.info =
            mount.querySelector(
                ".upcoming-cinema__info"
            );


        this.elements.movieTitle =
            mount.querySelector(
                ".upcoming-cinema__movie-title"
            );


        this.elements.metadata =
            mount.querySelector(
                ".upcoming-cinema__metadata"
            );


        this.elements.description =
            mount.querySelector(
                ".upcoming-cinema__description"
            );


        this.elements.release =
            mount.querySelector(
                ".upcoming-cinema__release"
            );


        this.elements.watchTrailerButton =
            mount.querySelector(
                '[data-action="watch-trailer"]'
            );


        /*------------------------------------------
            Trailer Rail Mount
        ------------------------------------------*/

        this.elements.trailerRailMount =
            mount.querySelector(
                "[data-trailer-rail-mount]"
            );


        /*------------------------------------------
            Trailer Rail Root

            TrailerRailView creates this element.
        ------------------------------------------*/

        this.elements.trailerRail =
            mount.querySelector(
                "[data-trailer-rail]"
            );

    }


    /*==================================================
        Mount Trailer Rail
    ==================================================*/

    mountTrailerRail() {

        const railMount =
            this.elements.trailerRailMount;


        if (!railMount) {

            console.warn(
                "Upcoming Cinema: " +
                "Trailer Rail mount was not found."
            );

            return;

        }


        if (!trailerRailController) {

            console.warn(
                "Upcoming Cinema: " +
                "Trailer Rail Controller unavailable."
            );

            return;

        }


        /*------------------------------------------
            Initialize Child Component
        ------------------------------------------*/

        if (
            typeof trailerRailController.init ===
            "function"
        ) {

            trailerRailController.init({

                mount: railMount,

                movies: this.upcomingMovies

            });

        }


        /*------------------------------------------
            Refresh Cached Rail Reference
        ------------------------------------------*/

        this.elements.trailerRail =
            railMount.querySelector(
                "[data-trailer-rail]"
            );


        console.log(
            "Upcoming Cinema → Trailer Rail mounted."
        );

    }


    /*==================================================
        Destroy Trailer Rail
    ==================================================*/

    destroyTrailerRail() {

        if (!trailerRailController) {

            return;

        }


        if (
            typeof trailerRailController.destroy ===
            "function"
        ) {

            trailerRailController.destroy();

        }


        this.elements.trailerRail =
            null;

        this.elements.trailerRailMount =
            null;

    }


    /*==================================================
        Bind Existing Watch Trailer
    ==================================================*/

    bindWatchTrailer() {

        const button =
            this.elements.watchTrailerButton;


        if (!button) {

            console.warn(
                "Upcoming Cinema: " +
                "Watch Trailer button not found."
            );

            return;

        }


        button.addEventListener(
            "click",
            this.handleWatchTrailer
        );

    }


    /*==================================================
        Remove Existing Watch Trailer Listener
    ==================================================*/

    removeWatchTrailerListener() {

        const button =
            this.elements.watchTrailerButton;


        if (!button) {

            return;

        }


        button.removeEventListener(
            "click",
            this.handleWatchTrailer
        );

    }


    /*==================================================
        Handle Existing Watch Trailer
    ==================================================*/

    handleWatchTrailer(event) {

        event.preventDefault();


        const movie =
            this.currentMovie;


        if (!movie) {

            console.warn(
                "Upcoming Cinema: " +
                "No active movie for trailer."
            );

            return;

        }


        this.emitWatchTrailer(
            movie
        );

    }


    /*==================================================
        Emit Watch Trailer
    ==================================================*/

    emitWatchTrailer(movie) {

        if (!movie) {

            return;

        }


        if (!movie.trailerUrl) {

            console.warn(
                "Upcoming Cinema: " +
                "No trailer available for movie " +
                movie.id
            );

            return;

        }


        /*
        ----------------------------------------------
            IMPORTANT

            This remains the established event
            contract used by Upcoming Cinema.

            The Trailer Rail should ultimately emit
            through the same event path.
        ----------------------------------------------
        */

        upcomingCinemaEvents.emit(

            UpcomingCinemaEventTypes.WATCH_TRAILER,

            {
                movie
            }

        );

    }


    /*==================================================
        Play Preview
    ==================================================*/

    async playPreview() {

        const video =
            this.elements.video;


        if (!video) {

            console.warn(
                "Upcoming Cinema: " +
                "Preview video not found."
            );

            return false;

        }


        /*------------------------------------------
            Cinematic Preview Configuration
        ------------------------------------------*/

        video.muted = true;

        video.volume = 0;

        video.loop = true;

        video.playsInline = true;


        /*------------------------------------------
            Start Playback
        ------------------------------------------*/

        try {

            await video.play();


            console.log(

                "Upcoming Cinema preview playing:",

                this.currentMovie ?
                this.currentMovie.title :
                ""

            );


            return true;

        } catch (error) {

            console.warn(

                "Upcoming Cinema preview " +
                "could not start:",

                error

            );


            return false;

        }

    }


    /*==================================================
        Pause Preview
    ==================================================*/

    pausePreview() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        video.pause();

    }


    /*==================================================
        Reset Preview
    ==================================================*/

    resetPreview() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        video.pause();


        try {

            video.currentTime = 0;

        } catch {

            /* Ignore reset errors */

        }

    }


    /*==================================================
        Set Upcoming Movies
    ==================================================*/

    setUpcomingMovies(
        movies = []
    ) {

        this.upcomingMovies =
            Array.isArray(movies) ?
            movies : [];


        if (
            trailerRailController &&
            typeof trailerRailController.setMovies ===
            "function"
        ) {

            trailerRailController.setMovies(
                this.upcomingMovies
            );

        }

    }


    /*==================================================
        Set Current Movie
    ==================================================*/

    setCurrentMovie(movie) {

        if (!movie) {

            return;

        }


        this.currentMovie =
            movie;

    }


    /*==================================================
        Get Preview Video
    ==================================================*/

    getPreviewVideo() {

        return this.elements.video;

    }


    /*==================================================
        Get Watch Trailer Button
    ==================================================*/

    getWatchTrailerButton() {

        return this.elements.watchTrailerButton;

    }


    /*==================================================
        Get Current Movie
    ==================================================*/

    getCurrentMovie() {

        return this.currentMovie;

    }


    /*==================================================
        Get Upcoming Movies
    ==================================================*/

    getUpcomingMovies() {

        return this.upcomingMovies;

    }


    /*==================================================
        Get Mount
    ==================================================*/

    getMount() {

        return this.elements.mount;

    }


    /*==================================================
        Get Section
    ==================================================*/

    getSection() {

        return this.elements.section;

    }


    /*==================================================
        Get Header
    ==================================================*/

    getHeader() {

        return this.elements.header;

    }


    /*==================================================
        Get Preview
    ==================================================*/

    getPreview() {

        return this.elements.preview;

    }


    /*==================================================
        Get Movie Title
    ==================================================*/

    getMovieTitle() {

        return this.elements.movieTitle;

    }


    /*==================================================
        Get Metadata
    ==================================================*/

    getMetadata() {

        return this.elements.metadata;

    }


    /*==================================================
        Get Description
    ==================================================*/

    getDescription() {

        return this.elements.description;

    }


    /*==================================================
        Get Release
    ==================================================*/

    getRelease() {

        return this.elements.release;

    }


    /*==================================================
        Get Trailer Rail
    ==================================================*/

    getTrailerRail() {

        return this.elements.trailerRail;

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        /*------------------------------------------
            Existing Watch Trailer
        ------------------------------------------*/

        this.removeWatchTrailerListener();


        /*------------------------------------------
            Background Preview
        ------------------------------------------*/

        this.resetPreview();


        /*------------------------------------------
            Child Trailer Rail
        ------------------------------------------*/

        this.destroyTrailerRail();


        /*------------------------------------------
            Reset Elements
        ------------------------------------------*/

        this.elements = {

            mount: null,

            section: null,

            header: null,

            title: null,

            subtitle: null,

            preview: null,

            video: null,

            content: null,

            info: null,

            movieTitle: null,

            metadata: null,

            description: null,

            release: null,

            watchTrailerButton: null,

            trailerRailMount: null,

            trailerRail: null

        };


        /*------------------------------------------
            Reset State
        ------------------------------------------*/

        this.currentMovie = null;

        this.upcomingMovies = [];

    }

}


/*==================================================
    Singleton
==================================================*/

export const upcomingCinemaView =
    new UpcomingCinemaView();