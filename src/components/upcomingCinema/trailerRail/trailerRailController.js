"use strict";


/*==================================================
    StreamFlix

    Trailer Rail Controller

    Responsibility:

    ✓ Coordinate Trailer Rail
    ✓ Normalize trailer movies
    ✓ Manage active trailer
    ✓ Handle trailer navigation
    ✓ Handle Watch Trailer selection
    ✓ Emit Trailer Rail events

    Does NOT handle:

    ✕ Backend requests
    ✕ DOM rendering
    ✕ Video playback implementation
    ✕ Mini Theatre implementation
==================================================*/


import {
    trailerRailView
} from "./trailerRailView.js";


import {
    trailerRailEvents
} from "./trailerRailEvents.js";


import {
    TrailerRailEventTypes
} from "./trailerRailEventTypes.js";


/*==================================================
    Trailer Rail Controller
==================================================*/

class TrailerRailController {


    constructor() {

        this.movies = [];

        this.activeIndex = 0;

        this.activeMovie = null;

        this.mount = null;

        this.initialized = false;


        /*------------------------------------------
            Bound Handlers
        ------------------------------------------*/

        this.handlePrevious =
            this.handlePrevious.bind(this);


        this.handleNext =
            this.handleNext.bind(this);


        this.handleWatchTrailer =
            this.handleWatchTrailer.bind(this);

        this.handleTrailerCardClick =
            this.handleTrailerCardClick.bind(this);

    }


    /*==================================================
        Initialize
    ==================================================*/

    init({
        mount = null,
        movies = [],
        activeMovieId = null
    } = {}) {

        console.log(
            "TrailerRailController.init"
        );


        if (!mount) {

            console.warn(
                "Trailer Rail: No mount element provided."
            );

            return false;

        }


        this.mount =
            mount;


        this.movies =
            this.normalizeMovies(
                movies
            );


        this.resolveActiveMovie(
            activeMovieId
        );


        trailerRailView.init({

            mount: this.mount,

            movies: this.movies,

            activeMovieId: this.activeMovie ?
                this.activeMovie.id : null

        });


        this.bindEvents();


        this.initialized =
            true;


        console.log(
            "Trailer Rail initialized:",
            this.movies.length,
            "trailers"
        );


        return true;

    }


    /*==================================================
        Normalize Movies
    ==================================================*/

    normalizeMovies(
        movies = []
    ) {

        if (!Array.isArray(movies)) {

            return [];

        }


        return movies.filter(

            movie =>

            movie &&

            movie.id !== undefined &&

            movie.trailerUrl

        );

    }


    /*==================================================
        Resolve Active Movie
    ==================================================*/

    resolveActiveMovie(
        activeMovieId = null
    ) {

        let index = -1;


        if (
            activeMovieId !== null &&
            activeMovieId !== undefined
        ) {

            index =
                this.movies.findIndex(

                    movie =>

                    String(movie.id) ===
                    String(activeMovieId)

                );

        }


        if (index === -1) {

            index =
                this.activeIndex;

        }


        if (
            index < 0 ||
            index >= this.movies.length
        ) {

            index = 0;

        }


        this.activeIndex =
            index;


        this.activeMovie =
            this.movies[index] ||
            null;

    }


    /*==================================================
        Bind Events
    ==================================================*/

    bindEvents() {

        this.unbindEvents();


        if (!this.mount) {

            return;

        }


        this.mount.addEventListener(
            "click",
            this.handlePrevious
        );


        this.mount.addEventListener(
            "click",
            this.handleNext
        );



        this.mount.addEventListener(
            "click",
            this.handleWatchTrailer
        );

        this.mount.addEventListener(
            "click",
            this.handleTrailerCardClick
        );
    }


    /*==================================================
        Unbind Events
    ==================================================*/

    unbindEvents() {

        if (!this.mount) {

            return;

        }


        this.mount.removeEventListener(
            "click",
            this.handlePrevious
        );


        this.mount.removeEventListener(
            "click",
            this.handleNext
        );




        this.mount.removeEventListener(
            "click",
            this.handleWatchTrailer
        );

        this.mount.removeEventListener(
            "click",
            this.handleTrailerCardClick
        );

    }


    /*==================================================
        Handle Previous
    ==================================================*/

    handlePrevious(event) {

        const button =
            event.target.closest(
                '[data-trailer-action="previous"]'
            );


        if (!button) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        this.showPrevious();

    }


    /*==================================================
        Handle Next
    ==================================================*/

    handleNext(event) {

        const button =
            event.target.closest(
                '[data-trailer-action="next"]'
            );


        if (!button) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        this.showNext();

    }


    /*==================================================
        Handle Watch Trailer
    ==================================================*/

    handleWatchTrailer(event) {

        const button =
            event.target.closest(
                '[data-trailer-action="watch"]'
            );


        if (!button) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        const movieId =
            button.dataset.movieId;


        if (!movieId) {

            console.warn(
                "Trailer Rail: Watch button has no movie ID."
            );

            return;

        }


        const movie =
            this.movies.find(

                item =>

                String(item.id) ===
                String(movieId)

            );


        if (!movie) {

            console.warn(
                "Trailer Rail: Movie not found:",
                movieId
            );

            return;

        }


        this.selectMovie(
            movie
        );


        this.emitWatchTrailer(
            movie
        );

    }

    /*==================================================
        Handle Trailer Card Click
    ==================================================*/

    handleTrailerCardClick(event) {

        /*
            Do not handle clicks on the Watch Trailer
            button here.

            handleWatchTrailer() already owns that action.

            This prevents the same click from triggering
            trailer playback twice.
        */

        if (
            event.target.closest(
                '[data-trailer-action="watch"]'
            )
        ) {

            return;

        }


        const card =
            event.target.closest(
                "[data-trailer-card]"
            );


        if (!card) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        const movieId =
            card.dataset.trailerId;


        if (!movieId) {

            console.warn(
                "Trailer Rail: Card has no movie ID."
            );

            return;

        }


        const movie =
            this.movies.find(

                item =>

                String(item.id) ===
                String(movieId)

            );


        if (!movie) {

            console.warn(
                "Trailer Rail: Movie not found:",
                movieId
            );

            return;

        }


        /*
            Select the trailer first.
        */

        this.selectMovie(
            movie
        );


        /*
            Reuse the SAME trailer event used
            by the existing Watch Trailer button.

            Do NOT call Mini Theatre directly here.
        */

        this.emitWatchTrailer(
            movie
        );

    }


    /*==================================================
        Show Previous
    ==================================================*/

    showPrevious() {

        if (!this.movies.length) {

            return null;

        }


        this.activeIndex--;


        if (this.activeIndex < 0) {

            this.activeIndex =
                this.movies.length - 1;

        }


        return this.updateActiveMovie();

    }


    /*==================================================
        Show Next
    ==================================================*/

    showNext() {

        if (!this.movies.length) {

            return null;

        }


        this.activeIndex++;


        if (
            this.activeIndex >=
            this.movies.length
        ) {

            this.activeIndex = 0;

        }


        return this.updateActiveMovie();

    }


    /*==================================================
        Previous Alias
    ==================================================*/

    previous() {

        return this.showPrevious();

    }


    /*==================================================
        Next Alias
    ==================================================*/

    next() {

        return this.showNext();

    }


    /*==================================================
        Update Active Movie
    ==================================================*/

    updateActiveMovie() {

        this.activeMovie =
            this.movies[
                this.activeIndex
            ] || null;


        if (!this.activeMovie) {

            return null;

        }


        trailerRailView.setActiveMovie(
            this.activeMovie.id
        );


        trailerRailEvents.emit(

            TrailerRailEventTypes.ACTIVE_CHANGED,

            {

                movie: this.activeMovie,

                index: this.activeIndex

            }

        );


        console.log(
            "Trailer Rail → Active:",
            this.activeMovie.title
        );


        return this.activeMovie;

    }


    /*==================================================
        Select Movie
    ==================================================*/

    selectMovie(movie) {

        if (!movie) {

            return null;

        }


        const index =
            this.movies.findIndex(

                item =>

                String(item.id) ===
                String(movie.id)

            );


        if (index === -1) {

            return null;

        }


        this.activeIndex =
            index;


        this.activeMovie =
            movie;


        trailerRailView.setActiveMovie(
            movie.id
        );


        trailerRailEvents.emit(

            TrailerRailEventTypes.TRAILER_SELECTED,

            {

                movie,

                index

            }

        );


        return movie;

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
                "Trailer Rail: Selected movie has no trailer:",
                movie.id
            );

            return;

        }


        console.log(
            "Trailer Rail → Watch Trailer:",
            movie.title
        );


        trailerRailEvents.emit(

            TrailerRailEventTypes.WATCH_TRAILER,

            {

                movie,

                trailer: movie.trailerUrl

            }

        );

    }


    /*==================================================
        Set Movies
    ==================================================*/

    setMovies(
        movies = [],
        activeMovieId = null
    ) {

        this.movies =
            this.normalizeMovies(
                movies
            );


        this.resolveActiveMovie(
            activeMovieId
        );


        if (!this.mount) {

            return;

        }


        trailerRailView.setMovies(

            this.movies,

            this.activeMovie ?
            this.activeMovie.id :
            null

        );

    }


    /*==================================================
        Get Active Movie
    ==================================================*/

    getActiveMovie() {

        return this.activeMovie;

    }


    /*==================================================
        Get Movies
    ==================================================*/

    getMovies() {

        return this.movies;

    }


    /*==================================================
        Get Active Index
    ==================================================*/

    getActiveIndex() {

        return this.activeIndex;

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        this.unbindEvents();


        if (
            trailerRailView &&
            typeof trailerRailView.destroy ===
            "function"
        ) {

            trailerRailView.destroy();

        }


        this.movies = [];

        this.activeIndex = 0;

        this.activeMovie = null;

        this.mount = null;

        this.initialized = false;

    }

}


/*==================================================
    Singleton
==================================================*/

export const trailerRailController =
    new TrailerRailController();