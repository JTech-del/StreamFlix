"use strict";

/*==================================================
    Thumbnail Controller

    Responsibility:
    Controls the StreamFlix Thumbnail
    component.

==================================================*/

import { thumbnailView } from "./thumbnailView.js";
import { thumbnailService } from "./thumbnailService.js";

class ThumbnailController {

    constructor() {

        this.movies = [];

        this.currentMovie = null;

        this.onMovieSelect = null;

        /*
                this.onMovieNavigate = null;
        */

        this.onMoviePlay = null;

        this.isNavigating = false;

        // Bound Event Handler
        this.boundHandleKeyboard =
            this.handleKeyboard.bind(this);

        /* Touch Statr */

        this.touchStartX = 0;

        this.touchEndX = 0;

        this.boundHandleTouchStart =
            this.handleTouchStart.bind(this);

        this.boundHandleTouchEnd =
            this.handleTouchEnd.bind(this);

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(container, movies = []) {

        if (!container) {

            console.error("Thumbnail container not found.");

            return;

        }

        thumbnailView.init(container);

        thumbnailView.render();

        this.loadMovies(movies);

        this.bindEvents();

        this.bindKeyboardEvents();




    }

    /*==============================================
        Load Movies
    ==============================================*/

    loadMovies(movies = []) {

        thumbnailService.setMovies(movies);

        this.movies =
            thumbnailService.getMovies();

        if (!this.movies.length) {

            console.warn("No movies available.");

            return;

        }

        this.currentMovie =

            thumbnailService.getFeaturedMovie();

        thumbnailView.renderMovies(this.movies);


    }

    /*==============================================
        Bind Events
    ==============================================*/

    bindEvents() {
        const {

            previousButton,
            nextButton

        } = thumbnailView.elements;


        /* Thumbnail Previous Button  */

        if (previousButton) {

            previousButton.addEventListener("pointerdown", () => {

                this.isNavigating = true;

            });

            previousButton.addEventListener("click", (event) => {

                event.preventDefault();

                event.stopPropagation();

                this.showPreviousMovie();

            });

        }

        /* ThumbnailNext Buttons */
        if (nextButton) {

            nextButton.addEventListener("pointerdown", () => {

                this.isNavigating = true;

            });

            nextButton.addEventListener("click", (event) => {

                event.preventDefault();

                event.stopPropagation();

                this.showNextMovie();

            });

        }

        document.addEventListener("pointerup", () => {

            requestAnimationFrame(() => {

                this.isNavigating = false;

            });

        });

        /* Listen to Hover event on the thumbnail track */
        const { track } = thumbnailView.elements;

        if (track) {

            track.addEventListener(

                "click",

                this.handleThumbnailClick.bind(this)

            );

            /*Track Touch Start Touch End */
            track.addEventListener(
                "touchstart",
                this.boundHandleTouchStart, { passive: true }
            );

            track.addEventListener(
                "touchend",
                this.boundHandleTouchEnd, { passive: true }
            );

        }
    }

    showPreviousMovie() {

        if (!this.currentMovie) {

            return;

        }

        const movie = thumbnailService.getPreviousMovie(

            this.currentMovie.slug

        );

        if (!movie) {

            return;

        }

        this.currentMovie = movie;

        thumbnailView.setActiveMovie(movie.slug);

        thumbnailView.focusMovie(movie.slug);


    }


    showNextMovie() {

        if (!this.currentMovie) {

            return;

        }

        const movie = thumbnailService.getNextMovie(

            this.currentMovie.slug

        );

        if (!movie) {

            return;

        }

        this.currentMovie = movie;

        thumbnailView.setActiveMovie(movie.slug);

        thumbnailView.focusMovie(movie.slug);

    }



    /*==============================================
        Select Movie
    ==============================================*/

    selectMovie(movie) {

            if (!movie) {

                return;

            }
            console.log("SELECTED THUMBNAIL MOVIE:", movie);
            this.currentMovie = movie;

            thumbnailView.setActiveMovie(

                movie.slug

            );

            if (this.onMovieSelect) {

                this.onMovieSelect(movie);

            }

        }
        /*==============================================
            Get Movies
        ==============================================*/

    getMovies() {

        return this.movies;

    }

    getNextMovie(slug) {

        const index = this.getMovieIndex(slug);

        if (index === -1) {

            return null;

        }

        const nextIndex =

            (index + 1) %

            this.movies.length;

        return this.movies[nextIndex];

    }


    getPreviousMovie(slug) {

        const index = this.getMovieIndex(slug);

        if (index === -1) {

            return null;

        }

        const previousIndex =

            (index - 1 + this.movies.length) %

            this.movies.length;

        return this.movies[previousIndex];

    }




    /*==============================================
        Select Callback
    ==============================================*/

    setMovieSelectHandler(callback) {

        if (typeof callback !== "function") {

            console.error(

                "Movie select handler must be a function."

            );

            return;

        }

        this.onMovieSelect = callback;

    }

    /*==============================================
        Handle Thumbnail Leave
    ==============================================*

    handleThumbnailLeave() {

        clearTimeout(this.hoverTimer);

        if (this.onMovieLeave) {

            this.onMovieLeave();

        }

    }

    /*==============================================
         Handle Thumbnail Click
==============================================*/

    handleThumbnailClick(event) {

        const playButton = event.target.closest(

            ".thumbnail__play"

        );

        const card = event.target.closest(

            ".thumbnail__card"

        );

        if (!card) {

            return;

        }

        const movie = thumbnailService.getMovie(

            card.dataset.slug

        );

        if (!movie) {

            return;

        }

        // Play button clicked
        if (playButton) {

            event.stopPropagation();

            this.playMovie(movie);

            return;

        }

        // Poster clicked
        this.selectMovie(movie);

    }

    /*==============================================
    Play Movie
==============================================*/

    playMovie(movie) {

        if (!movie) {

            return;

        }

        console.log(

            "▶ Playing:",

            movie.title

        );

        if (this.onMoviePlay) {

            this.onMoviePlay(movie);

        }

    }

    /*==============================================
        Set Active Movie (Public Mthod )
    ==============================================*/

    setActiveMovie(slug) {

        const movie = thumbnailService.getMovie(slug);

        if (!movie) {

            return;

        }

        this.currentMovie = movie;

        thumbnailView.setActiveMovie(slug);

    }

    /*==============================================
        Set Navigation Callback
    ==============================================*/

    setMovieNavigateHandler(callback) {

        if (typeof callback !== "function") {

            console.error(

                "Movie navigation handler must be a function."

            );

            return;

        }

        this.onMovieNavigate = callback;

    }

    /*==============================================
    Play Callback
==============================================*/

    setMoviePlayHandler(callback) {

        if (typeof callback !== "function") {

            console.error(

                "Movie play handler must be a function."

            );

            return;

        }

        this.onMoviePlay = callback;

    }

    /*==============================================
        Touch Start
    ==============================================*/

    handleTouchStart(event) {

        this.touchStartX =

            event.changedTouches[0].clientX;

    }

    /*==============================================
    Handle Touch End
==============================================*/
    handleTouchEnd(event) {

        this.touchEndX =
            event.changedTouches[0].clientX;

        this.detectSwipe();

    }


    /*==============================================
    Detect Swipe
==============================================*/

    detectSwipe() {

        const distance =

            this.touchStartX -

            this.touchEndX;

        const threshold = 50;

        if (Math.abs(distance) < threshold) {

            return;

        }

        if (distance > 0) {

            this.showNextMovie();

        } else {

            this.showPreviousMovie();

        }

    }




    /*==============================================
    Keyboard Events
==============================================*/

    bindKeyboardEvents() {

            document.addEventListener(

                "keydown",

                this.boundHandleKeyboard

            );

        }
        /*==============================================
            Handle Keyboard
        ==============================================*/

    handleKeyboard(event) {

        switch (event.key) {

            case "ArrowLeft":

                event.preventDefault();

                this.showPreviousMovie();

                break;

            case "ArrowRight":

                event.preventDefault();

                this.showNextMovie();

                break;

            case "Enter":

                event.preventDefault();

                if (this.currentMovie) {

                    this.selectMovie(this.currentMovie);

                }

                break;

            case " ":

            case "Space":

            case "Spacebar":

                event.preventDefault();

                if (this.currentMovie) {

                    this.playMovie(this.currentMovie);

                }

                break;

        }

    }

    /*==============================================
        Lock Interaction
    ==============================================*/

    lockInteraction() {

        thumbnailView.disableInteraction();

    }


    /*==============================================
        Unlock Interaction
    ==============================================*/

    unlockInteraction() {

        thumbnailView.enableInteraction();

    }

    /*==============================================
        Destroy
 
       ==============================================*/



    destroy() {

        document.removeEventListener(
            "keydown",
            this.boundHandleKeyboard
        );

        thumbnailView.destroy();

        this.movies = [];

        this.currentMovie = null;

    }

}

export const thumbnailController = new ThumbnailController();