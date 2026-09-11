"use strict";

/*==================================================
    StreamFlix

    App Controller

    Responsibility:

    ✓ Bootstraps application
    ✓ Initializes components
    ✓ Initializes multiple Media Rails
    ✓ Connects Media Rail events
    ✓ Initializes Mini Theatre
    ✓ Initializes Upcoming Cinema

    Does NOT handle:

    ✗ Media Rail visual rendering
    ✗ Media Rail business logic
    ✗ Movie filtering logic inside the rail
==================================================*/


/*==================================================
    Core Components
==================================================*/

import {
    NavbarController
} from "../components/navbar/navbarController.js";

import {
    HeroController
} from "../components/hero/heroController.js";

import {
    searchController
} from "../components/search/searchController.js";

import {
    thumbnailController
} from "../components/thumbnail/thumbnailController.js";

import {
    miniTheatreController
} from "../components/miniTheatre/index.js";


/*==================================================
    Movie Services
==================================================*/

import {
    loadMovies,
    loadMovie
} from "../services/movieService.js";


/*==================================================
    Upcoming Cinema
==================================================*/

import {
    upcomingCinemaController
} from "../components/upcomingCinema/upcomingCinemaController.js";

import {
    upcomingCinemaEvents
} from "../components/upcomingCinema/upcomingCinemaEvents.js";

import {
    UpcomingCinemaEventTypes
} from "../components/upcomingCinema/upcomingCinemaEventTypes.js";


/*==================================================
    Media Rail
==================================================*/

import {
    MediaRailController
} from "../components/mediaRail/mediaRailController.js";

import {
    mediaRailEvents
} from "../components/mediaRail/mediaRailEvents.js";

import {
    MediaRailEventTypes
} from "../components/mediaRail/mediaRailEventTypes.js";


/*==================================================
    Footer Import
==================================================*/
import {
    footerController
} from "../components/footer/footer.js";
/*==================================================
    App Controller
==================================================*/

class AppController {


    /*==============================================
        Constructor
    ==============================================*/

    constructor() {

        /*------------------------------------------
            DOM Elements
        ------------------------------------------*/

        this.elements = {};


        /*------------------------------------------
            Component Controllers
        ------------------------------------------*/

        this.navbar = null;

        this.hero = null;

        this.search = null;

        this.thumbnail = null;

        this.miniTheatre = null;

        this.footer = null;


        /*------------------------------------------
            Movies
        ------------------------------------------*/

        this.movies = [];


        /*------------------------------------------
            Media Rails
        ------------------------------------------*/

        this.mediaRails = {

            secondary: new MediaRailController(),

            recommended: new MediaRailController(),

            newReleases: new MediaRailController(),

            watchlist: new MediaRailController()

        };


        /*------------------------------------------
            Application State
        ------------------------------------------*/

        this.state = {

            activeMovie: null,

            previewMovie: null,

            selectedTrailer: null

        };

    }


    /*==================================================
        Initialize Application
    ==================================================*/

    async init() {

        console.log(
            "1 - AppController.init"
        );


        /*------------------------------------------
            Cache DOM
        ------------------------------------------*/

        this.cacheElements();


        console.log(
            "2 - cacheElements"
        );


        /*------------------------------------------
            Load Movies
        ------------------------------------------*/

        try {

            this.movies =
                await loadMovies();


            console.log(
                "Backend movies loaded:",
                this.movies
            );


            searchController.setMovies(
                this.movies
            );


        } catch (error) {

            console.error(
                "Failed to load movies from backend:",
                error
            );

            return;

        }


        /*------------------------------------------
            Navbar
        ------------------------------------------*/

        this.initializeNavbar();


        console.log(
            "3 - navbar"
        );


        /*------------------------------------------
            Search Mount
        ------------------------------------------*/

        this.cacheSearchMount();


        console.log(
            "4 - search mount"
        );


        /*------------------------------------------
            Search
        ------------------------------------------*/

        this.initializeSearch();


        console.log(
            "5 - search"
        );


        /*------------------------------------------
            Hero
        ------------------------------------------*/

        this.initializeHero();


        console.log(
            "6 - hero"
        );


        /*------------------------------------------
            Thumbnail Rail
        ------------------------------------------*/

        this.initializeThumbnail();


        console.log(
            "7 - thumbnail"
        );


        /*------------------------------------------
            Media Rails
        ------------------------------------------*/

        this.initializeMediaRails();


        console.log(
            "7.5 - media rails"
        );


        /*------------------------------------------
            Mini Theatre
        ------------------------------------------*/

        this.initializeMiniTheatre();


        console.log(
            "8 - miniTheatre"
        );


        /*------------------------------------------
            Media Rail Events
        ------------------------------------------*/

        this.bindMediaRailEvents();


        /*------------------------------------------
            Upcoming Cinema Events
        ------------------------------------------*/

        this.bindUpcomingCinemaEvents();


        /*------------------------------------------
            Upcoming Cinema
        ------------------------------------------*/

        await this.initializeUpcomingCinema();


        console.log(
            "9 - upcomingCinema"
        );



        /*------------------------------------------
    Footer
------------------------------------------*/

        this.initializeFooter();


        console.log(
            "10 - footer"
        );


        console.log(
            "StreamFlix initialized."
        );

    }


    /*==================================================
        Cache DOM Elements
    ==================================================*/

    cacheElements() {

        this.elements = {

            navbar: document.getElementById(
                "navbar"
            ),


            main: document.getElementById(
                "main-content"
            ),


            footer: document.getElementById(
                "footer"
            ),


            search: document.getElementById(
                "search"
            ),


            thumbnail: document.getElementById(
                "thumbnail"
            ),


            miniTheatre: document.getElementById(
                "mini-theatre"
            ),


            /*--------------------------------------
                Media Rail 1
            --------------------------------------*/

            mediaRailSecondary: document.getElementById(
                "media-rail-secondary"
            ),


            /*--------------------------------------
                Media Rail 2
            --------------------------------------*/

            mediaRailRecommended: document.getElementById(
                "media-rail-recommended"
            ),


            /*--------------------------------------
                Media Rail 3
            --------------------------------------*/

            mediaRailNewReleases: document.getElementById(
                "media-rail-new-releases"
            ),


            /*--------------------------------------
                Media Rail 4
            --------------------------------------*/

            mediaRailWatchlist: document.getElementById(
                "media-rail-watchlist"
            )

        };

    }


    /*==================================================
        Cache Search Mount
    ==================================================*/

    cacheSearchMount() {

        this.elements.search =
            document.getElementById(
                "navbar-search"
            );


        console.log(
            "Search mount:",
            this.elements.search
        );

    }


    /*==================================================
        Navbar
    ==================================================*/

    initializeNavbar() {

        if (!this.elements.navbar) {

            console.error(
                "Navbar mount point not found."
            );

            return;

        }


        this.navbar =
            new NavbarController(
                this.elements.navbar
            );


        this.navbar.init();

    }


    /*==================================================
        Search
    ==================================================*/

    initializeSearch() {

        if (!this.elements.search) {

            console.error(
                "Search mount point not found."
            );

            return;

        }


        this.search =
            searchController;


        this.search.init(
            this.elements.search
        );


        this.search.setMovieHoverHandler(
            this.handleMoviePreview.bind(this)
        );


        this.search.setMovieLeaveHandler(
            this.restoreActiveMovie.bind(this)
        );


        this.search.setMovieSelectHandler(
            this.setActiveMovie.bind(this)
        );


        if (this.navbar) {

            this.navbar.setSearchToggleHandler(
                () => this.search.toggle()
            );

        }

    }


    /*==================================================
        Hero
    ==================================================*/

    initializeHero() {

        if (!this.elements.main) {

            console.error(
                "Main content mount point not found."
            );

            return;

        }


        this.hero =
            new HeroController(
                this.elements.main
            );


        const featuredMovie =
            this.movies.find(
                movie => movie.featured
            );


        if (!featuredMovie) {

            console.warn(
                "No featured movie found."
            );

            return;

        }


        this.hero.init(
            featuredMovie
        );


        this.state.activeMovie =
            featuredMovie;

    }


    /*==================================================
        Thumbnail
    ==================================================*/

    initializeThumbnail() {

        if (!this.elements.thumbnail) {

            console.error(
                "Thumbnail mount point not found."
            );

            return;

        }


        this.thumbnail =
            thumbnailController;


        this.thumbnail.init(

            this.elements.thumbnail,

            this.movies

        );


        this.thumbnail.setMovieSelectHandler(

            this.setActiveMovie.bind(this)

        );


        this.thumbnail.setMoviePlayHandler(

            this.playMovie.bind(this)

        );

    }


    /*==================================================
        Initialize All Media Rails
    ==================================================*/

    initializeMediaRails() {

        /*------------------------------------------
            Secondary / More Movies
        ------------------------------------------*/

        this.initializeMediaRail({

            key: "secondary",

            element: this.elements.mediaRailSecondary,

            title: "More Movies",

            items: [
                ...this.movies
            ]

        });


        /*------------------------------------------
            Recommended
        ------------------------------------------*/

        this.initializeMediaRail({

            key: "recommended",

            element: this.elements.mediaRailRecommended,

            title: "Recommended For You",

            items: this.getRecommendedMovies()

        });


        /*------------------------------------------
            New Releases
        ------------------------------------------*/

        this.initializeMediaRail({

            key: "newReleases",

            element: this.elements.mediaRailNewReleases,

            title: "New Releases",

            items: this.getNewReleaseMovies()

        });


        /*------------------------------------------
            Watchlist
        ------------------------------------------*/

        this.initializeMediaRail({

            key: "watchlist",

            element: this.elements.mediaRailWatchlist,

            title: "My Watchlist",

            items: this.getWatchlistMovies()

        });

    }


    /*==================================================
        Initialize Individual Media Rail
    ==================================================*/

    initializeMediaRail({

        key,

        element,

        title,

        items = []

    }) {

        if (!element) {

            console.warn(
                `${key} Media Rail mount not found.`
            );

            return;

        }


        /*
            Reuse the controller created
            in the AppController constructor.
        */

        const controller =
            this.mediaRails[key];


        if (!controller) {

            console.error(
                `Media Rail controller "${key}" not found.`
            );

            return;

        }


        /*------------------------------------------
            Shared Rail Configuration
        ------------------------------------------*/

        controller.init({

            container: element,

            items,

            template: "item",

            title,

            loop: true,

            keyboard: false,

            swipe: true,

            visibleItems: 6

        });


        /*------------------------------------------
            Render
        ------------------------------------------*/

        controller.render();


        console.log(
            `${title} Media Rail initialized:`,
            items.length,
            "movies"
        );

    }

    /*==================================================
        Footer
    ==================================================*/

    initializeFooter() {

        if (!this.elements.footer) {

            console.error(
                "Footer mount point not found."
            );

            return;

        }


        this.footer =
            footerController;


        this.footer.init(
            this.elements.footer
        );

    }

    /*==================================================
        Recommended Movies
    ==================================================*/

    getRecommendedMovies() {

        /*
            Temporary source.

            Recommendation logic will be
            connected later.

            The visual rail remains identical.
        */

        return [
            ...this.movies
        ];

    }


    /*==================================================
        New Releases
    ==================================================*/

    getNewReleaseMovies() {

        return [
            ...this.movies
        ].sort(

            (a, b) => {

                const yearA =
                    Number(a.year) || 0;


                const yearB =
                    Number(b.year) || 0;


                return yearB - yearA;

            }

        );

    }


    /*==================================================
        Watchlist
    ==================================================*/

    getWatchlistMovies() {

        /*
            Until My List persistence is connected,
            return an empty collection.

            This prevents us from pretending that
            every movie is in the user's watchlist.
        */

        return [];

    }


    /*==================================================
        Mini Theatre
    ==================================================*/

    initializeMiniTheatre() {

        if (!this.elements.miniTheatre) {

            console.warn(
                "Mini Theatre mount not found."
            );

            return;

        }


        this.miniTheatre =
            miniTheatreController;


        this.miniTheatre.init(

            this.elements.miniTheatre

        );

    }


    /*==================================================
        Upcoming Cinema
    ==================================================*/

    async initializeUpcomingCinema() {

        try {

            await upcomingCinemaController.init();

        } catch (error) {

            console.error(
                "Failed to initialize Upcoming Cinema:",
                error
            );

        }

    }

    /*==================================================
        Footer
    ==================================================*/

    initializeFooter() {

            if (!this.elements.footer) {

                console.error(
                    "Footer mount point not found."
                );

                return;

            }


            this.footer =
                footerController;


            this.footer.init(
                this.elements.footer
            );

        }
        /*==================================================
            Upcoming Cinema Events
        ==================================================*/

    bindUpcomingCinemaEvents() {

        upcomingCinemaEvents.on(

            UpcomingCinemaEventTypes.TRAILER_SELECTED,

            async({ trailer }) => {

                if (!trailer) {

                    return;

                }


                console.log(
                    "Upcoming Cinema → Trailer Selected:",
                    trailer
                );


                this.state.selectedTrailer =
                    trailer;


                if (!this.miniTheatre) {

                    console.error(
                        "Mini Theatre is not initialized."
                    );

                    return;

                }


                try {

                    /*
                        Trailer playback is temporary.

                        It does NOT enter the
                        persistent playlist.
                    */

                    await this.miniTheatre.playTrailer(
                        trailer
                    );

                } catch (error) {

                    console.error(
                        "Failed to play trailer in Mini Theatre:",
                        error
                    );

                }

            }

        );

    }


    /*==================================================
        Media Rail Events
    ==================================================*/

    bindMediaRailEvents() {

        /*------------------------------------------
            Theatre
        ------------------------------------------*/

        mediaRailEvents.on(

            MediaRailEventTypes.THEATRE,

            ({ item }) => {

                if (!item) {

                    return;

                }


                console.log(
                    "Media Rail → Mini Theatre:",
                    item
                );


                if (!this.miniTheatre) {

                    console.error(
                        "Mini Theatre is not initialized."
                    );

                    return;

                }


                this.playMovie(item);

            }

        );


        /*------------------------------------------
            Download
        ------------------------------------------*/

        mediaRailEvents.on(

            MediaRailEventTypes.DOWNLOAD,

            ({ item }) => {

                if (!item) {

                    return;

                }


                console.log(
                    "Media Rail → Download:",
                    item
                );

            }

        );


        /*------------------------------------------
            My List
        ------------------------------------------*/

        mediaRailEvents.on(

            MediaRailEventTypes.MY_LIST,

            ({ item }) => {

                if (!item) {

                    return;

                }


                console.log(
                    "Media Rail → My List:",
                    item
                );

            }

        );

    }


    /*==================================================
        Set Active Movie
    ==================================================*/

    setActiveMovie(movie) {

        if (!movie) {

            return;

        }


        this.state.activeMovie =
            movie;


        this.state.previewMovie =
            null;


        if (this.hero) {

            this.hero.update(
                movie
            );

        }


        if (this.thumbnail) {

            this.thumbnail.setActiveMovie(
                movie.slug
            );

        }


        if (this.search) {

            this.search.setActiveMovie(
                movie.slug
            );

        }

    }


    /*==================================================
        Navigate Movie
    ==================================================*/

    navigateMovie(movie) {

        if (!movie) {

            return;

        }


        this.state.activeMovie =
            movie;


        if (this.hero) {

            this.hero.update(
                movie
            );

        }

    }


    /*==================================================
        Handle Movie Preview
    ==================================================*/

    handleMoviePreview(movie) {

        if (!movie) {

            return;

        }


        this.state.previewMovie =
            movie;


        if (this.hero) {

            this.hero.update(
                movie
            );

        }

    }


    /*==================================================
        Restore Active Movie
    ==================================================*/

    restoreActiveMovie() {

        if (!this.state.activeMovie) {

            return;

        }


        if (this.hero) {

            this.hero.update(
                this.state.activeMovie
            );

        }

    }


    /*==================================================
        Play Movie
    ==================================================*/

    async playMovie(movie) {

        if (!movie ||
            !this.miniTheatre
        ) {

            return;

        }


        try {

            const movieId =
                movie.id;


            const backendMovie =
                await loadMovie(
                    movieId
                );


            console.log(
                "Backend movie sent to Mini Theatre:",
                backendMovie
            );


            this.miniTheatre.play(
                backendMovie
            );


        } catch (error) {

            console.error(
                "Failed to load movie from backend:",
                error
            );

        }

    }

}


/*==================================================
    Singleton
==================================================*/

export const appController =
    new AppController();