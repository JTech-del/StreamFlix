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



class MiniTheatreController {

    constructor() {

        this.movie = null;

        this.playlist = [];

        this.isOpen = false;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        miniTheatreView.init(container);

        miniTheatreView.render();

    }

    /*==============================================
        Open
    ==============================================*/

    open(movie) {

        if (!movie) {

            return;

        }

        this.movie = movie;

        this.isOpen = true;

        this.selectMovie(movie);

        console.log(

            "🎬 Mini Theatre:",

            movie.title

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