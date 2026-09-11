"use strict";

/*==================================================
    StreamFlix

    Trailer Rail View

    Responsibility:

    ✓ Render trailer rail
    ✓ Render trailer cards
    ✓ Render trailer video thumbnails
    ✓ Cache rail DOM elements
    ✓ Update active trailer card
    ✓ Control thumbnail preview playback
    ✓ Handle empty state

    Does NOT handle:

    ✕ Backend requests
    ✕ Movie loading
    ✕ Application state
    ✕ Mini Theatre
    ✕ Trailer selection business logic
    ✕ Navigation logic
==================================================*/


/*==================================================
    Templates
==================================================*/

import {
    trailerRailTemplates
} from "./trailerRailTemplates.js";


/*==================================================
    Trailer Rail View
==================================================*/

class TrailerRailView {


    constructor() {

        this.elements = {

            mount: null,

            rail: null,

            track: null,

            cards: [],

            previousButton: null,

            nextButton: null

        };


        this.movies = [];

        this.activeMovieId = null;

    }


    /*==================================================
        Initialize
    ==================================================*/

    init({
        mount = null,
        movies = [],
        activeMovieId = null
    } = {}) {

        if (mount) {

            this.elements.mount = mount;

        }


        if (!this.elements.mount) {

            console.warn(
                "Trailer Rail View: Mount point not found."
            );

            return false;

        }


        this.movies =
            Array.isArray(movies) ?
            movies : [];


        this.activeMovieId =
            activeMovieId;


        this.render();


        return true;

    }


    /*==================================================
        Render
    ==================================================*/

    render() {

        const mount =
            this.elements.mount;


        if (!mount) {

            console.warn(
                "Trailer Rail View: Cannot render without mount."
            );

            return;

        }


        /*------------------------------------------
            Stop Existing Previews
        ------------------------------------------*/

        this.stopAllCardPreviews();


        /*------------------------------------------
            Render Empty State
        ------------------------------------------*/

        if (!this.movies.length) {

            mount.innerHTML =
                trailerRailTemplates.emptyState();

            this.cacheElements();

            return;

        }


        /*------------------------------------------
            Render Rail
        ------------------------------------------*/

        mount.innerHTML =
            trailerRailTemplates.rail(
                this.movies,
                this.activeMovieId
            );


        /*------------------------------------------
            Cache DOM
        ------------------------------------------*/

        this.cacheElements();


        /*------------------------------------------
            Prepare Videos
        ------------------------------------------*/

        this.prepareVideos();

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


        this.elements.rail =
            mount.querySelector(
                "[data-trailer-rail]"
            );


        this.elements.track =
            mount.querySelector(
                "[data-trailer-track]"
            );


        this.elements.cards =
            Array.from(
                mount.querySelectorAll(
                    "[data-trailer-card]"
                )
            );


        this.elements.previousButton =
            mount.querySelector(
                '[data-trailer-action="previous"]'
            );


        this.elements.nextButton =
            mount.querySelector(
                '[data-trailer-action="next"]'
            );

    }


    /*==================================================
        Prepare Trailer Videos
    ==================================================*
    prepareVideos() {

        const cards =
            this.elements.cards;


        if (!cards.length) {

            return;

        }


        cards.forEach(
            card => {

                const video =
                    card.querySelector(
                        "[data-trailer-video]"
                    );


                if (!video) {

                    return;

                }


                video.muted = true;

                video.volume = 0;

                video.loop = true;

                video.playsInline = true;

                video.preload = "metadata";


                const playPromise =
                    video.play();


                if (
                    playPromise &&
                    typeof playPromise.catch ===
                    "function"
                ) {

                    playPromise.catch(
                        error => {

                            console.warn(
                                "Trailer Rail: Preview playback failed:",
                                error
                            );

                        }
                    );

                }

            }
        );

    }

/*==================================================
    Prepare Trailer Videos
==================================================*/

    prepareVideos() {

        const cards =
            this.elements.cards;


        if (!cards.length) {

            return;

        }


        cards.forEach(

            card => {

                const video =
                    card.querySelector(
                        "[data-trailer-video]"
                    );


                if (!video) {

                    return;

                }


                /*--------------------------------------
                    Validate Source
                --------------------------------------*/

                const source =
                    video.currentSrc ||
                    video.src;


                if (!source) {

                    console.warn(

                        "Trailer Rail: " +
                        "No trailer source found for card.",

                        card.dataset.trailerId

                    );

                    return;

                }


                /*--------------------------------------
                    Configure Preview
                --------------------------------------*/

                video.muted = true;

                video.volume = 0;

                video.loop = true;

                video.playsInline = true;

                video.preload = "metadata";


                /*--------------------------------------
                    Start Preview
                --------------------------------------*/

                const playPromise =
                    video.play();


                if (
                    playPromise &&
                    typeof playPromise.catch ===
                    "function"
                ) {

                    playPromise.catch(

                        error => {

                            console.warn(

                                "Trailer Rail: " +
                                "Preview playback failed:",

                                error

                            );

                        }

                    );

                }

            }

        );

    }


    /*==================================================
        Play Card Preview
    ==================================================*/

    playCardPreview(card) {

        if (!card) {

            return;

        }


        const video =
            card.querySelector(
                "[data-trailer-video]"
            );


        if (!video) {

            return;

        }


        video.muted = true;

        video.volume = 0;


        const promise =
            video.play();


        if (
            promise &&
            typeof promise.catch ===
            "function"
        ) {

            promise.catch(
                error => {

                    console.warn(
                        "Trailer Rail: Preview playback failed:",
                        error
                    );

                }
            );

        }

    }


    /*==================================================
        Pause Card Preview
    ==================================================*/

    pauseCardPreview(card) {

        if (!card) {

            return;

        }


        const video =
            card.querySelector(
                "[data-trailer-video]"
            );


        if (!video) {

            return;

        }


        video.pause();

    }


    /*==================================================
        Stop All Card Previews
    ==================================================*/

    stopAllCardPreviews() {

        const cards =
            this.elements.cards || [];


        cards.forEach(
            card => {

                this.pauseCardPreview(
                    card
                );

            }
        );

    }


    /*==================================================
        Set Active Movie
    ==================================================*/

    setActiveMovie(movieId) {

        this.activeMovieId =
            movieId;


        const cards =
            this.elements.cards;


        cards.forEach(
            card => {

                const cardId =
                    card.dataset.trailerId;


                const isActive =
                    String(cardId) ===
                    String(movieId);


                card.classList.toggle(
                    "is-active",
                    isActive
                );


                if (isActive) {

                    card.setAttribute(
                        "aria-current",
                        "true"
                    );

                } else {

                    card.removeAttribute(
                        "aria-current"
                    );

                }

            }
        );


        this.scrollToActiveCard();

    }


    /*==================================================
        Scroll To Active Card
    ==================================================*/

    scrollToActiveCard() {

        const track =
            this.elements.track;


        if (!track) {

            return;

        }


        const activeCard =
            this.elements.cards.find(
                card =>
                String(
                    card.dataset.trailerId
                ) ===
                String(
                    this.activeMovieId
                )
            );


        if (!activeCard) {

            return;

        }


        activeCard.scrollIntoView({

            behavior: "smooth",

            block: "nearest",

            inline: "center"

        });

    }


    /*==================================================
        Refresh
    ==================================================*/

    refresh(
        movies = [],
        activeMovieId = null
    ) {

        this.movies =
            Array.isArray(movies) ?
            movies : [];


        this.activeMovieId =
            activeMovieId;


        this.render();

    }


    /*==================================================
        Update Movies
    ==================================================*/

    setMovies(
        movies = []
    ) {

        this.movies =
            Array.isArray(movies) ?
            movies : [];


        this.render();

    }


    /*==================================================
        Get Mount
    ==================================================*/

    getMount() {

        return this.elements.mount;

    }


    /*==================================================
        Get Rail
    ==================================================*/

    getRail() {

        return this.elements.rail;

    }


    /*==================================================
        Get Track
    ==================================================*/

    getTrack() {

        return this.elements.track;

    }


    /*==================================================
        Get Cards
    ==================================================*/

    getCards() {

        return this.elements.cards;

    }


    /*==================================================
        Get Previous Button
    ==================================================*/

    getPreviousButton() {

        return this.elements.previousButton;

    }


    /*==================================================
        Get Next Button
    ==================================================*/

    getNextButton() {

        return this.elements.nextButton;

    }


    /*==================================================
        Get Movies
    ==================================================*/

    getMovies() {

        return this.movies;

    }


    /*==================================================
        Get Active Movie ID
    ==================================================*/

    getActiveMovieId() {

        return this.activeMovieId;

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        this.stopAllCardPreviews();


        if (
            this.elements.mount
        ) {

            this.elements.mount.innerHTML =
                "";

        }


        this.elements = {

            mount: null,

            rail: null,

            track: null,

            cards: [],

            previousButton: null,

            nextButton: null

        };


        this.movies = [];

        this.activeMovieId = null;

    }

}


/*==================================================
    Singleton
==================================================*/

export const trailerRailView =
    new TrailerRailView();