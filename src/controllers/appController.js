"use strict";

/*==================================================
    StreamFlix

    App Controller

    Responsibility:

    ✓ Bootstraps application
    ✓ Initializes components

==================================================*/
import { NavbarController } from "../components/navbar/navbarController.js";

import { HeroController } from "../components/hero/heroController.js";

import { searchController } from "../components/search/searchController.js";

import { thumbnailController } from "../components/thumbnail/thumbnailController.js";

import { miniTheatreController } from "../components/miniTheatre/index.js";

class AppController {

    constructor() {

        this.elements = {};

        this.navbar = null;

        this.hero = null;

        this.search = null;

        this.thumbnail = null;

        this.miniTheatre = null;

        this.state = {

            activeMovie: null,

            previewMovie: null

        };

    }

    /*==============================================
        Initialize
    ==============================================*/

    init() {

        console.log("1 - AppController.init");

        this.cacheElements();

        console.log("2 - cacheElements");

        this.initializeNavbar();

        console.log("3 - navbar");

        // Navbar has now rendered into the DOM
        this.cacheSearchMount();

        console.log("4 - search mount");

        this.initializeSearch();

        console.log("5 - search");

        this.initializeHero();

        console.log("6 - hero");


        this.initializeThumbnail();

        console.log("7 - thumbnail");

        this.initializeMiniTheatre();
        console.log("8 - miniTheatre");

        console.log("✅ StreamFlix initialized.");


    }

    /*==============================================
        Cache DOM
    ==============================================*/

    cacheElements() {


            this.elements = {

                navbar:

                    document.getElementById("navbar"),

                main:

                    document.getElementById("main-content"),

                footer:

                    document.getElementById("footer"),

                search:

                    document.getElementById("search"),

                thumbnail:

                    document.getElementById("thumbnail"),

                miniTheatre:

                    document.getElementById("mini-theatre"),

            }




        }
        /*==============================================
            Cache Search Mount
        ==============================================*/

    cacheSearchMount() {
        console.log(this.elements.search);
        this.elements.search = document.getElementById("navbar-search");

    }



    /*==============================================
        Navbar
    ==============================================*/

    initializeNavbar() {

        if (!this.elements.navbar) {

            console.error("Navbar mount point not found.");

            return;

        }

        this.navbar = new NavbarController(

            this.elements.navbar

        );

        this.navbar.init();

    }

    /*==============================================
        Search
    ==============================================*/

    initializeSearch() {

            if (!this.elements.search) {

                console.error("Search mount point not found.");

                return;

            }

            this.search = searchController;

            this.search.init(this.elements.search);

            /*
            this.search.setMovieHoverHandler(

                this.handleMovieHover.bind(this)

            );
            */

            this.search.setMovieHoverHandler(

                this.previewMovie.bind(this)

            );

            this.search.setMovieLeaveHandler(

                this.restoreActiveMovie.bind(this)

            );

            this.search.setMovieSelectHandler(

                this.setActiveMovie.bind(this)

            );


            this.navbar.setSearchToggleHandler(

                () => this.search.toggle()

            );
        }
        /*==============================================
    Handle Movie Hover
==============================================*

    handleMovieHover(movie) {

        if (!this.hero) {

            return;

        }
        this.hero.update(movie);

        this.thumbnail.setActiveMovie(

            movie.slug

        );

    }
*/

    /*==============================================
        Hero
    ==============================================*/

    initializeHero() {

        if (!this.elements.main) {

            console.error("Main content mount point not found.");

            return;

        }

        this.hero = new HeroController(

            this.elements.main

        );

        this.hero.init();

        this.state.activeMovie = this.hero.currentHero;

    }

    /*==============================================
        Thumbnail
    ==============================================*/

    initializeThumbnail() {

        if (!this.elements.thumbnail) {

            console.error(

                "Thumbnail mount point not found."

            );

            return;

        }

        this.thumbnail = thumbnailController;

        this.thumbnail.init(

            this.elements.thumbnail

        );


        this.thumbnail.setMovieSelectHandler(

            this.setActiveMovie.bind(this)

        );

        this.thumbnail.setMoviePlayHandler(

            this.playMovie.bind(this)

        );

    }

    /*==============================================
    InitializeMinTheartre
==============================================*/

    initializeMiniTheatre() {

        if (!this.elements.miniTheatre) {

            return;

        }

        this.miniTheatre = miniTheatreController;

        this.miniTheatre.init(this.elements.miniTheatre);

    }

    /*==============================================
    Navigate Movie
==============================================*/

    navigateMovie(movie) {

        if (!movie) {

            return;

        }

        this.state.activeMovie = movie;

        this.hero.update(movie);

    }



    /*==============================================
    Set Active Movie
==============================================*/

    setActiveMovie(movie) {

            if (!movie) {

                return;

            }

            this.state.activeMovie = movie;

            this.state.previewMovie = null;

            this.hero.update(movie);

            this.thumbnail.setActiveMovie(movie.slug);

            this.search.setActiveMovie(movie.slug);

        }
        /*==============================================
            Preview Movie
        ==============================================*/

    previewMovie(movie) {

        if (!movie) {

            return;

        }

        this.state.previewMovie = movie;

        this.hero.update(movie);

    }


    /*==============================================
    Restore Active Movie
==============================================*/

    restoreActiveMovie() {

            if (!this.state.activeMovie) {

                return;

            }

            this.hero.update(

                this.state.activeMovie

            );

        }
        /*==============================================
            Play Movie
        ==============================================*/

    playMovie(movie) {

        if (!this.miniTheatre) {

            console.error("Mini Theatre is not initialized.");

            return;

        }

        this.miniTheatre.open(movie);

    }

}

export const appController = new AppController();