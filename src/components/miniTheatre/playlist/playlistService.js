"use strict";

/*==================================================
    StreamFlix

    Playlist Service

    File:
    src/components/miniTheatre/playlist/playlistService.js

    Responsibility:

    ✓ Store playlist
    ✓ Manage current movie
    ✓ Provide playlist operations

==================================================*/
import { playlistView } from "./playlistView.js";
import { playlistService } from "./playlistService.js";

class PlaylistService {

    constructor() {
        this.onMovieSelect = null;
    }

    /*==============================================
        Load Movies
    ==============================================*/

    loadMovies(movies = []) {

        playlistService.loadMovies(

            movies

        );

        playlistView.renderMovies(

            playlistService.getMovies()

        );

    }

    /*==============================================
        Selecte Movies
    ==============================================*/
    selectMovie(movie) {

            if (!movie) {

                return;

            }

            playlistService.setCurrentMovie(

                movie

            );

            playlistView.setActiveMovie(

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

        return playlistService.getMovies();

    }

    /*==============================================
    Get Movie
==============================================*/

    getMovie(slug) {

        const movie = this.movies.find(

            movie => movie.slug === slug

        );

        if (!movie) {

            return null;

        }

        return movie;

    }

    /*==============================================
        Add Movie
    ==============================================*/

    addMovie(movie) {

        if (!movie) {

            return;

        }

        playlistService.addMovie(

            movie

        );

        playlistView.renderMovies(

            playlistService.getMovies()

        );

    }

    /*==============================================
        Remove Movie
    ==============================================*/
    removeMovie(slug) {

            playlistService.removeMovie(

                slug

            );

            playlistView.renderMovies(

                playlistService.getMovies()

            );

        }
        /*==============================================
            Clear Playlist
        ==============================================*/

    clear() {

        playlistService.clear();

        playlistView.clear();

    }

    /*==============================================
        Set Current Movie
    ==============================================*/

    setCurrentMovie(movie) {

        this.currentMovie = movie;

    }

    /*==============================================
        Get Current Movie
    ==============================================*/

    getCurrentMovie() {

        return playlistService.getCurrentMovie();

    }

    /*==============================================
        Has Movies
    ==============================================*/

    hasMovies() {

        return this.movies.length > 0;

    }

    /*==============================================
        Get Playlist Size
    ==============================================*/

    getCount() {

        return this.movies.length;

    }



}

export const playlistService = new PlaylistService();