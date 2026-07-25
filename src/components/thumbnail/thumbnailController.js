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

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (!container) {

            console.error("Thumbnail container not found.");

            return;

        }

        thumbnailView.init(container);

        thumbnailView.render();

        this.loadMovies();

        this.bindEvents();

    }

    /*==============================================
        Load Movies
    ==============================================*/

    loadMovies() {

        this.movies = thumbnailService.getMovies();

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

        if (previousButton) {

            previousButton.addEventListener(

                "click",

                () => {

                    console.log("Previous");

                }

            );

        }



        if (nextButton) {

            nextButton.addEventListener(

                "click",

                () => {

                    console.log("Next");

                }

            );

        }


        /* Listen to Hover event on the thumbnail track */
        const { track } = thumbnailView.elements;

        if (track) {

            track.addEventListener(

                "click",

                this.handleThumbnailClick.bind(this)

            );

        }

    }



    /*==============================================
        Get Movies
    ==============================================*/

    getMovies() {

        return this.movies;

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
==============================================*/

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

        const card = event.target.closest(".thumbnail__card");

        if (!card) {

            return;

        }

        console.log("Thumbnail clicked:", card.dataset.slug);

        const movie = thumbnailService.getMovie(

            card.dataset.slug

        );

        console.log(movie);

        if (this.onMovieSelect) {

            this.onMovieSelect(movie);

        }

    }

    /*==============================================
    Set Active Movie (Public Mthod )
==============================================*/

    setActiveMovie(slug) {

        thumbnailView.setActiveMovie(slug);

    }


    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        thumbnailView.destroy();

        this.movies = [];

        this.currentMovie = null;

    }

}

export const thumbnailController = new ThumbnailController();