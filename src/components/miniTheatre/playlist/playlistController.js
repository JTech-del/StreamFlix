"use strict";

/*==================================================
    StreamFlix

    Playlist Controller

    File:
    src/components/miniTheatre/playlist/playlistController.js

    Responsibility:

    ✓ Initialize playlist
    ✓ Load movies
    ✓ Handle selection
    ✓ Handle playlist events
    ✓ Notify Mini Theatre

==================================================*/

import { playlistView } from "./playlistView.js";

class PlaylistController {

    constructor() {

        this.movies = [];

        this.currentMovie = null;

        this.onMovieSelect = null;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        playlistView.init(container);

        playlistView.render();

    }

    /*==============================================
        Load Movies
    ==============================================*/

    loadMovies(movies = []) {

        this.movies = movies;

        playlistView.renderMovies(

            this.movies

        );

    }

    /*==============================================
        Select Movie
    ==============================================*/

    selectMovie(movie) {

        if (!movie) {

            return;

        }

        this.currentMovie = movie;

        playlistView.setActiveMovie(

            movie.slug

        );

        if (this.onMovieSelect) {

            this.onMovieSelect(movie);

        }

    }

    /*==============================================
        Get Current Movie
    ==============================================*/

    getCurrentMovie() {

        return this.currentMovie;

    }

    /*==============================================
        Get Movies
    ==============================================*/

    getMovies() {

        return this.movies;

    }

    /*==============================================
        Add Movie
    ==============================================*/

    addMovie(movie) {

        if (!movie) {

            return;

        }

        this.movies.push(movie);

        playlistView.renderMovies(

            this.movies

        );

    }

    /*==============================================
        Remove Movie
    ==============================================*/

    removeMovie(slug) {

        this.movies = this.movies.filter(

            movie => movie.slug !== slug

        );

        playlistView.renderMovies(

            this.movies

        );

    }

    /*==============================================
        Clear Playlist
    ==============================================*/

    clear() {

        this.movies = [];

        playlistView.clear();

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
        Destroy
    ==============================================*/

    /*==============================================
    Destroy
==============================================*/

    destroy() {

        playlistService.clear();

        playlistView.destroy();

    }

}

export const playlistController =
    new PlaylistController();