"use strict";

/*==================================================
    StreamFlix

    Playlist Service

    Responsibility

    ✓ Store playlist
    ✓ Manage current movie
    ✓ Playlist navigation
    ✓ Emit playlist events

==================================================*/

import { playlistEvents } from "./playlistEvents.js";
import { PlaylistEventTypes } from "./playlistEventTypes.js";

class PlaylistService {

    constructor() {

        this.movies = [];

        this.currentIndex = -1;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(movies = []) {

        this.movies = [...movies];

        this.currentIndex =

            this.movies.length ? 0 : -1;

        playlistEvents.emit(

            PlaylistEventTypes.INITIALIZED,

            {

                movies: this.getAll(),

                current: this.getCurrent(),

                index: this.currentIndex,

                total: this.count()

            }

        );

    }

    /*==============================================
        Add Movie
    ==============================================*/

    add(movie) {

        if (!movie || this.has(movie.slug)) {

            return;

        }

        this.movies.push(movie);

        playlistEvents.emit(

            PlaylistEventTypes.MOVIE_ADDED,

            {

                movie,

                movies: this.getAll(),

                total: this.count()

            }

        );

        playlistEvents.emit(

            PlaylistEventTypes.UPDATED,

            {

                movies: this.getAll(),

                total: this.count()

            }

        );

    }

    /*==============================================
        Remove Movie
    ==============================================*/

    remove(slug) {

        const index =

            this.indexOf(slug);

        if (index === -1) {

            return;

        }

        const movie = this.movies[index];

        this.movies.splice(index, 1);

        if (

            this.currentIndex >= this.movies.length

        ) {

            this.currentIndex =

                this.movies.length - 1;

        }

        playlistEvents.emit(

            PlaylistEventTypes.MOVIE_REMOVED,

            {

                movie,

                movies: this.getAll(),

                total: this.count()

            }

        );

        playlistEvents.emit(

            PlaylistEventTypes.UPDATED,

            {

                movies: this.getAll(),

                total: this.count()

            }

        );

    }

    /*==============================================
        Clear
    ==============================================*/

    clear() {

        this.movies = [];

        this.currentIndex = -1;

        playlistEvents.emit(

            PlaylistEventTypes.CLEARED

        );

        playlistEvents.emit(

            PlaylistEventTypes.UPDATED,

            {

                movies: [],

                total: 0

            }

        );

    }

    /*==============================================
        Current Movie
    ==============================================*/

    setCurrent(index) {

        if (

            index < 0 ||

            index >= this.movies.length

        ) {

            return;

        }

        this.currentIndex = index;

        playlistEvents.emit(

            PlaylistEventTypes.CURRENT_CHANGED,

            {

                movie: this.getCurrent(),

                index

            }

        );

    }

    /*==============================================
        Navigation
    ==============================================*/

    next() {

        if (!this.movies.length) {

            return null;

        }

        const next =

            (this.currentIndex + 1) %

            this.movies.length;

        this.setCurrent(next);

        playlistEvents.emit(

            PlaylistEventTypes.NEXT,

            {

                movie: this.getCurrent(),

                index: next

            }

        );

        return this.getCurrent();

    }

    previous() {

        if (!this.movies.length) {

            return null;

        }

        const previous =

            (this.currentIndex - 1 + this.movies.length)

        %
        this.movies.length;

        this.setCurrent(previous);

        playlistEvents.emit(

            PlaylistEventTypes.PREVIOUS,

            {

                movie: this.getCurrent(),

                index: previous

            }

        );

        return this.getCurrent();

    }

    /*==============================================
        Helpers
    ==============================================*/

    has(slug) {

        return this.movies.some(

            movie => movie.slug === slug

        );

    }

    indexOf(slug) {

        return this.movies.findIndex(

            movie => movie.slug === slug

        );

    }

    get(index) {

        if (

            index < 0 ||

            index >= this.movies.length

        ) {

            return null;

        }

        return this.movies[index];

    }

    getCurrent() {

        return this.get(

            this.currentIndex

        );

    }

    getAll() {

        return [...this.movies];

    }

    count() {

        return this.movies.length;

    }

}

export const playlistService =
    new PlaylistService();