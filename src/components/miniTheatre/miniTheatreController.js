"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Controller

    Responsibility:

    ✓ Initialize Mini Theatre
    ✓ Open Movie
    ✓ Close Theatre
    ✓ Load Playlist
    ✓ Update Preview
    ✓ Coordinate Plugins

==================================================*/

import { miniTheatreView } from "./miniTheatreView.js";
import { pluginHost } from "../../core/mediaRail/pluginHost.js";
import { playlistController } from "./playlist/playlistController.js";
import { HERO_DATA } from "../../data/hero/heroData.js";

class MiniTheatreController {

    constructor() {

        this.movie = null;

        this.playlist = [];

        this.isOpen = false;


        this.playlist = playlistController;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        miniTheatreView.init(container);

        miniTheatreView.render();

        this.initializePlaylist();

    }

    /*==============================================
        Open
    ==============================================*/

    open(movie) {

        if (!movie) {

            return;

        }

        this.movie = movie;

        miniTheatreView.renderPreview(movie);

        this.isOpen = true;

        this.selectMovie(movie);

        this.playlist.selectMovie(movie);

        console.log(

            "🎬 Mini Theatre:",

            movie.title

        );


    }

    /*==============================================
        Initialize Playlist
    ==============================================*/
    /*
        initializePlaylist() {

                const container =

                    miniTheatreView.elements.playlist;

                if (!container) {

                    console.error(

                        "Playlist container not found."

                    );

                    return;

                }

                this.playlist.init(

                    container

                );

                this.playlist.setMovieSelectHandler(

                    this.open.bind(this)

                );

            }
                */
    initializePlaylist() {

            const container =

                miniTheatreView.elements.playlist;

            if (!container) {

                return;

            }

            this.playlist.init(

                container

            );

            this.playlist.loadMovies(

                HERO_DATA

            );

            this.playlist.setMovieSelectHandler(

                this.open.bind(this)

            );

        }
        /*==============================================
            Close
        ==============================================*/

    close() {

        this.movie = null;

        this.isOpen = false;

        miniTheatreView.clearPreview();

    }

    /*==============================================
        Playlist
    ==============================================*/

    loadPlaylist(movies = []) {

        this.playlist = movies;

    }

    getPlaylist() {

        return this.playlist;

    }

    /*==============================================
        Current Movie
    ==============================================*/

    getCurrentMovie() {

        return this.movie;

    }

    /*==============================================
        Is Open
    ==============================================*/

    isOpened() {

        return this.isOpen;

    }

    /*==============================================
        Refresh Preview
    ==============================================*/

    refresh() {

        if (!this.movie) {

            return;

        }

        miniTheatreView.showPreview(

            this.movie

        );

    }

    /** */
    bindEvents() {

            const {

                playButton

            } = miniTheatreView.elements;

            if (!playButton) {

                return;

            }

            playButton.addEventListener(

                "click",

                () => {

                    miniTheatreView.showHighlight();

                }

            );

        }
        /*==============================================
            Plugins
        ==============================================*/

    initializePlugins() {

        pluginHost.mount(

            miniTheatreView.elements.plugins

        );

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.close();

        this.playlist = [];

        miniTheatreView.destroy();

    }

}




export const miniTheatreController = new MiniTheatreController();