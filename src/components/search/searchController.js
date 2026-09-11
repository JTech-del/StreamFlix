"use strict";

/*==================================================
    Search Controller

    Responsibility:

    ✓ Controls the Search component
    ✓ Receives movies from backend
    ✓ Passes movies to SearchService
    ✓ Handles search input
    ✓ Handles search result interaction
    ✓ Handles movie hover
    ✓ Handles movie selection
    ✓ Controls search open / close state

==================================================*/

import { searchView } from "./searchView.js";
import { searchService } from "./searchService.js";


class SearchController {

    constructor() {

        this.query = "";

        this.hoverTimer = null;

        this.onMovieHover = null;

        this.onMovieLeave = null;

        this.onMovieSelect = null;

        this.state = {

            open: false

        };

    }


    /*==============================================
        Set Movies
    ==============================================*/

    setMovies(movies = []) {

        searchService.setMovies(movies);

        console.log(
            "Search movies loaded:",
            movies.length
        );

    }


    /*==============================================
        Set Hover Callback
    ==============================================*/

    setMovieHoverHandler(callback) {

        if (typeof callback !== "function") {

            console.error(
                "Movie hover handler must be a function."
            );

            return;

        }

        this.onMovieHover = callback;

    }


    /*==============================================
        Set Leave Callback
    ==============================================*/

    setMovieLeaveHandler(callback) {

        if (typeof callback !== "function") {

            console.error(
                "Movie leave handler must be a function."
            );

            return;

        }

        this.onMovieLeave = callback;

    }


    /*==============================================
        Set Select Callback
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
        Initialize
    ==============================================*/

    init(container) {

        console.log(
            "Search container:",
            container
        );


        if (!container) {

            console.error(
                "Search mount point not found."
            );

            return;

        }


        searchView.init(container);

        searchView.render();

        this.bindEvents();

    }


    /*==============================================
        Bind Events
    ==============================================*/

    bindEvents() {

        const {

            input,

            clearButton,

            searchButton

        } = searchView.elements;


        /*------------------------------
            Search Input
        ------------------------------*/

        if (input) {

            input.addEventListener(

                "input",

                this.handleInput.bind(this)

            );

        }


        /*------------------------------
            Clear Search
        ------------------------------*/

        if (clearButton) {

            clearButton.addEventListener(

                "click",

                this.clearSearch.bind(this)

            );

        }


        /*------------------------------
            Search Result Events
        ------------------------------*/

        this.bindResultEvents();


        /*------------------------------
            Search Icon
        ------------------------------*/

        if (searchButton) {

            searchButton.addEventListener(

                "click",

                this.focusInput.bind(this)

            );

        }


        /*------------------------------
            Outside Click
        ------------------------------*/

        document.addEventListener(

            "click",

            this.handleOutsideClick.bind(this)

        );


        /*------------------------------
            Keyboard
        ------------------------------*/

        document.addEventListener(

            "keydown",

            this.handleKeyDown.bind(this)

        );

    }


    /*==============================================
        Handle Input
    ==============================================*/

    handleInput(event) {

        this.query =
            event.target.value.trim();


        /*------------------------------
            Empty Search
        ------------------------------*/

        if (!this.query) {

            searchView.clearResults();

            return;

        }


        /*------------------------------
            Prepare Results
        ------------------------------*/

        searchView.elements.results.classList.remove(
            "is-open"
        );

        searchView.clearResults();


        /*------------------------------
            Search Backend Movies
        ------------------------------*/

        const results =
            searchService.search(
                this.query
            );


        /*------------------------------
            Render Results
        ------------------------------*/

        searchView.renderResults(
            results
        );

    }


    /*==============================================
        Focus Input
    ==============================================*/

    focusInput() {

        const {
            input
        } = searchView.elements;


        if (input) {

            input.focus();

        }

    }


    /*==============================================
        Clear Search
    ==============================================*/

    clearSearch() {

        this.query = "";

        searchView.clearInput();

        searchView.clearResults();

        this.focusInput();

    }


    /*==============================================
        Get Query
    ==============================================*/

    getQuery() {

        return this.query;

    }


    /*==============================================
        Bind Result Events
    ==============================================*/

    bindResultEvents() {

        const {
            results
        } = searchView.elements;


        if (!results) {

            return;

        }


        /*------------------------------
            Hover
        ------------------------------*/

        results.addEventListener(

            "mouseover",

            this.handleResultHover.bind(this)

        );


        /*------------------------------
            Click
        ------------------------------*/

        results.addEventListener(

            "click",

            this.handleResultClick.bind(this)

        );


        /*------------------------------
            Leave
        ------------------------------*/

        results.addEventListener(

            "mouseleave",

            this.handleResultLeave.bind(this)

        );

    }


    /*==============================================
        Handle Result Hover
    ==============================================*/

    handleResultHover(event) {

        const card =
            event.target.closest(
                ".search__result"
            );


        if (!card) {

            return;

        }


        const movie =
            searchService.getMovie(
                card.dataset.slug
            );


        if (!movie) {

            return;

        }


        clearTimeout(
            this.hoverTimer
        );


        this.hoverTimer = setTimeout(() => {

            if (this.onMovieHover) {

                this.onMovieHover(movie);

            }

        }, 180);

    }


    /*==============================================
        Handle Result Leave
    ==============================================*/

    handleResultLeave() {

        clearTimeout(
            this.hoverTimer
        );


        if (this.onMovieLeave) {

            this.onMovieLeave();

        }

    }


    /*==============================================
        Handle Result Click
    ==============================================*/

    handleResultClick(event) {

        const card =
            event.target.closest(
                ".search__result"
            );


        if (!card) {

            return;

        }


        const movie =
            searchService.getMovie(
                card.dataset.slug
            );


        if (!movie) {

            return;

        }


        if (this.onMovieSelect) {

            this.onMovieSelect(movie);

        }

    }


    /*==============================================
        Handle Outside Click
    ==============================================*/

    handleOutsideClick(event) {

        const {
            section
        } = searchView.elements;


        if (!section) {

            return;

        }


        if (section.contains(event.target)) {

            return;

        }


        searchView.clearResults();

    }


    /*==============================================
        Handle Keyboard
    ==============================================*/

    handleKeyDown(event) {

        if (event.key !== "Escape") {

            return;

        }


        this.clearSearch();

    }


    /*==============================================
        Open Search
    ==============================================*/

    open() {

        this.state.open = true;

        searchView.open();

    }


    /*==============================================
        Close Search
    ==============================================*/

    close() {

        this.state.open = false;

        searchView.close();

    }


    /*==============================================
        Toggle Search
    ==============================================*/

    toggle() {

        this.state.open

            ?
            this.close()

        : this.open();

    }


    /*==============================================
        Set Active Movie
    ==============================================*/

    setActiveMovie(slug) {

        searchView.setActiveMovie(
            slug
        );

    }


    /*==============================================
        Is Open
    ==============================================*/

    isOpen() {

        return this.state.open;

    }

}


export const searchController =
    new SearchController();