"use strict";

/*==================================================
    StreamFlix

    Playlist Service

    Responsibility

    ✓ Store playlist
    ✓ Manage current movie
    ✓ Manage completed movies
    ✓ Manage next-up movie
    ✓ Playlist navigation
    ✓ Movie identity
    ✓ Persist playlist state
    ✓ Emit playlist events

    Business logic lives here.

==================================================*/

import { playlistEvents }
from "./playlistEvents.js";

import { PlaylistEventTypes }
from "./playlistEventTypes.js";

import { playlistStorage }
from "./playlistStorage.js";


class PlaylistService {

    constructor() {

        this.movies = [];

        this.currentIndex = -1;

        /*
        Store completed movie identities.
        */

        this.completed = new Set();

        /*
        Index of the movie that should be
        indicated as NEXT UP.
        */

        this.nextUpIndex = -1;

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(movies = []) {

        /*
        Restore saved playlist.
        */

        const storedMovies =
            playlistStorage.loadPlaylist();

        const storedIndex =
            playlistStorage.loadCurrentIndex();

        const storedCompleted =
            playlistStorage.loadCompleted();

        const storedNextUp =
            playlistStorage.loadNextUp();


        /*
        Use stored playlist when available.
        Otherwise use supplied movies.
        */

        this.movies =
            storedMovies.length ?
            storedMovies :
            Array.isArray(movies) ? [...movies] : [];


        /*
        Restore current index safely.
        */

        this.currentIndex =
            this.movies.length ?
            Math.max(
                0,
                Math.min(
                    Number.isInteger(storedIndex) ?
                    storedIndex :
                    0,
                    this.movies.length - 1
                )
            ) :
            -1;


        /*
        Restore completed identities.
        */

        this.completed =
            new Set(

                Array.isArray(storedCompleted) ?
                storedCompleted : []

            );


        /*
        Remove completed identities that
        no longer exist in the playlist.
        */

        this.completed =

            new Set(

                this.movies

                .map(movie =>
                    this.getMovieKey(movie)
                )

                .filter(key =>
                    key &&
                    this.completed.has(key)
                )

            );


        /*
        Restore next-up index.

        Storage contains the movie identity,
        not a fragile array index.
        */

        this.nextUpIndex = -1;


        if (storedNextUp) {

            const index =
                this.indexOf(storedNextUp);

            if (index !== -1) {

                this.nextUpIndex = index;

            }

        }


        /*
        If there is no stored next-up state,
        calculate it from the current movie.
        */

        if (
            this.nextUpIndex === -1 &&
            this.movies.length > 1
        ) {

            this.nextUpIndex =
                this.findNextIncompleteIndex(
                    this.currentIndex
                );

        }


        /*
        Notify application that playlist
        is ready.
        */

        playlistEvents.emit(

            PlaylistEventTypes.INITIALIZED,

            {

                movies: this.getAll(),

                total: this.count(),

                currentIndex: this.currentIndex,

                nextUpIndex: this.nextUpIndex

            }

        );


        /*
        Playlist updated.
        */

        this.emitUpdated();


        /*
        Restore current movie.
        */

        const current =
            this.getCurrent();


        if (current) {

            playlistEvents.emit(

                PlaylistEventTypes.CURRENT_CHANGED,

                {

                    movie: current,

                    index: this.currentIndex

                }

            );

        }


        /*
        Restore next-up state.
        */

        this.emitNextUpChanged();

    }


    /*==============================================
        Add Movie
    ==============================================*/

    add(movie) {

        if (!movie) {

            return null;

        }


        const key =
            this.getMovieKey(movie);


        if (!key) {

            return null;

        }


        /*
        Do not add duplicate movies.
        */

        if (this.has(key)) {

            return this.get(
                this.indexOf(key)
            );

        }


        this.movies.push(movie);


        playlistStorage.savePlaylist(

            this.movies

        );


        /*
        If this is the first movie,
        make it current.
        */

        if (this.currentIndex === -1) {

            this.currentIndex = 0;

            playlistStorage.saveCurrentIndex(
                this.currentIndex
            );

        }


        /*
        If there is no next-up movie,
        the newly added movie can become
        the next candidate when appropriate.
        */

        if (
            this.nextUpIndex === -1 &&
            this.movies.length > 1
        ) {

            this.nextUpIndex =
                this.findNextIncompleteIndex(
                    this.currentIndex
                );

            this.persistNextUp();

        }


        playlistEvents.emit(

            PlaylistEventTypes.MOVIE_ADDED,

            {

                movie,

                movies: this.getAll(),

                total: this.count()

            }

        );


        this.emitUpdated();

        this.emitNextUpChanged();


        return movie;

    }


    /*==============================================
        Remove Movie
    ==============================================*/

    remove(id) {

        const index =
            this.indexOf(id);


        if (index === -1) {

            return null;

        }


        const movie =
            this.movies[index];


        const removedKey =
            this.getMovieKey(movie);


        /*
        Remove from playlist.
        */

        this.movies.splice(
            index,
            1
        );


        /*
        Remove completed state.
        */

        if (removedKey) {

            this.completed.delete(
                removedKey
            );

        }


        /*
        Adjust current index.
        */

        if (!this.movies.length) {

            this.currentIndex = -1;

        } else if (
            index < this.currentIndex
        ) {

            this.currentIndex--;

        } else if (
            this.currentIndex >=
            this.movies.length
        ) {

            this.currentIndex =
                this.movies.length - 1;

        }


        /*
        Recalculate next-up.
        */

        this.nextUpIndex =
            this.findNextIncompleteIndex(
                this.currentIndex
            );


        /*
        Persist everything.
        */

        playlistStorage.savePlaylist(
            this.movies
        );

        playlistStorage.saveCurrentIndex(
            this.currentIndex
        );

        this.persistCompleted();

        this.persistNextUp();


        /*
        Notify removal.
        */

        playlistEvents.emit(

            PlaylistEventTypes.MOVIE_REMOVED,

            {

                movie,

                movies: this.getAll(),

                total: this.count()

            }

        );


        this.emitUpdated();

        this.emitNextUpChanged();


        return movie;

    }


    /*==============================================
        Clear
    ==============================================*/

    clear() {

        this.movies = [];

        this.currentIndex = -1;

        this.completed.clear();

        this.nextUpIndex = -1;


        playlistStorage.clear();


        playlistEvents.emit(

            PlaylistEventTypes.CLEARED

        );


        this.emitUpdated();

        this.emitNextUpChanged();

    }


    /*==============================================
        Set Current Movie
    ==============================================*/

    setCurrent(index) {

        if (!Number.isInteger(index) ||
            index < 0 ||
            index >= this.movies.length
        ) {

            return null;

        }


        this.currentIndex = index;


        /*
        A movie being selected becomes the
        current movie. It should no longer
        be marked NEXT UP.
        */

        if (
            this.nextUpIndex === index
        ) {

            this.nextUpIndex =
                this.findNextIncompleteIndex(
                    index
                );

        }


        playlistStorage.saveCurrentIndex(
            this.currentIndex
        );


        this.persistNextUp();


        const movie =
            this.getCurrent();


        playlistEvents.emit(

            PlaylistEventTypes.CURRENT_CHANGED,

            {

                movie,

                index

            }

        );


        this.emitNextUpChanged();


        return movie;

    }


    /*==============================================
        Mark Movie Completed
    ==============================================*/

    complete(index = this.currentIndex) {

        if (!Number.isInteger(index) ||
            index < 0 ||
            index >= this.movies.length
        ) {

            return null;

        }


        const movie =
            this.get(index);


        if (!movie) {

            return null;

        }


        const key =
            this.getMovieKey(movie);


        if (!key) {

            return null;

        }


        /*
        Mark movie completed.
        */

        this.completed.add(key);


        /*
        The completed movie cannot remain
        NEXT UP.
        */

        if (
            this.nextUpIndex === index
        ) {

            this.nextUpIndex = -1;

        }


        /*
        Find the next incomplete movie.
        */

        const nextIndex =
            this.findNextIncompleteIndex(
                index
            );


        this.nextUpIndex =
            nextIndex;


        /*
        Persist state.
        */

        this.persistCompleted();

        this.persistNextUp();


        /*
        Emit completion.
        */

        playlistEvents.emit(

            PlaylistEventTypes.MOVIE_COMPLETED,

            {

                movie,

                index,

                nextMovie: this.get(nextIndex),

                nextIndex

            }

        );


        /*
        Tell the application that NEXT UP
        has changed.
        */

        this.emitNextUpChanged();

        this.emitUpdated();


        return {

            movie,

            index,

            nextMovie: this.get(nextIndex),

            nextIndex

        };

    }


    /*==============================================
        Mark Movie Incomplete
    ==============================================*/

    markIncomplete(index) {

        if (!Number.isInteger(index) ||
            index < 0 ||
            index >= this.movies.length
        ) {

            return null;

        }


        const movie =
            this.get(index);


        if (!movie) {

            return null;

        }


        const key =
            this.getMovieKey(movie);


        if (key) {

            this.completed.delete(key);

        }


        playlistStorage.savePlaylist(
            this.movies
        );

        this.persistCompleted();


        this.emitUpdated();


        return movie;

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


        const movie =
            this.setCurrent(next);


        playlistEvents.emit(

            PlaylistEventTypes.NEXT,

            {

                movie,

                index: next

            }

        );


        return movie;

    }


    previous() {

        if (!this.movies.length) {

            return null;

        }


        const previous =

            (
                this.currentIndex - 1 +
                this.movies.length
            ) %
            this.movies.length;


        const movie =
            this.setCurrent(previous);


        playlistEvents.emit(

            PlaylistEventTypes.PREVIOUS,

            {

                movie,

                index: previous

            }

        );


        return movie;

    }


    /*==============================================
        Helpers
    ==============================================*/

    getMovieKey(movieOrId) {

        if (!movieOrId) {

            return null;

        }


        /*
        Movie object.
        */
        if (
            typeof movieOrId === "object" &&
            movieOrId !== null
        ) {

            return (

                movieOrId.slug ||

                movieOrId.backendId ||

                movieOrId.id ||

                null

            );

        }


        /*
        Primitive identity.
        */

        return movieOrId;

    }


    /*==============================================
        Has Movie
    ==============================================*/

    has(movieOrId) {

        const key =
            this.getMovieKey(movieOrId);


        if (!key) {

            return false;

        }


        return this.movies.some(

            movie =>
            this.getMovieKey(movie) === key

        );

    }


    /*==============================================
        Index Of
    ==============================================*/

    indexOf(movieOrId) {

        const key =
            this.getMovieKey(movieOrId);


        if (!key) {

            return -1;

        }


        return this.movies.findIndex(

            movie =>
            this.getMovieKey(movie) === key

        );

    }


    /*==============================================
        Get Movie
    ==============================================*/

    get(index) {

        if (!Number.isInteger(index) ||
            index < 0 ||
            index >= this.movies.length
        ) {

            return null;

        }


        return this.movies[index];

    }


    /*==============================================
        Get Current Movie
    ==============================================*/

    getCurrent() {

        return this.get(
            this.currentIndex
        );

    }


    /*==============================================
        Get All Movies
    ==============================================*/

    getAll() {

        return [
            ...this.movies
        ];

    }


    /*==============================================
        Count
    ==============================================*/

    count() {

        return this.movies.length;

    }


    /*==============================================
        Get Current Index
    ==============================================*/

    getCurrentIndex() {

        return this.currentIndex;

    }


    /*==============================================
        Get Next Up Index
    ==============================================*/

    getNextUpIndex() {

        return this.nextUpIndex;

    }


    /*==============================================
        Get Next Up Movie
    ==============================================*/

    getNextUp() {

        return this.get(
            this.nextUpIndex
        );

    }


    /*==============================================
        Is Completed
    ==============================================*/

    isCompleted(movieOrId) {

        const key =
            this.getMovieKey(movieOrId);


        if (!key) {

            return false;

        }


        return this.completed.has(key);

    }


    /*==============================================
        Get Completed Movies
    ==============================================*/

    getCompleted() {

        return this.movies.filter(

            movie =>
            this.isCompleted(movie)

        );

    }


    /*==============================================
        Find Next Incomplete Movie
    ==============================================*/

    findNextIncompleteIndex(
        fromIndex = this.currentIndex
    ) {

        if (!this.movies.length) {

            return -1;

        }


        /*
        Start immediately after the current
        movie and wrap around the playlist.
        */

        for (
            let offset = 1; offset <= this.movies.length; offset++
        ) {

            const index =

                (
                    fromIndex + offset
                ) %
                this.movies.length;


            if (!this.isCompleted(
                    this.movies[index]
                )) {

                return index;

            }

        }


        /*
        Every movie is completed.
        */

        return -1;

    }


    /*==============================================
        Persist Completed State
    ==============================================*/

    persistCompleted() {

        playlistStorage.saveCompleted(

            [
                ...this.completed
            ]

        );

    }


    /*==============================================
        Persist Next Up State
    ==============================================*/

    persistNextUp() {

        const movie =
            this.getNextUp();


        playlistStorage.saveNextUp(

            movie ?
            this.getMovieKey(movie) :
            null

        );

    }


    /*==============================================
        Emit Updated
    ==============================================*/

    emitUpdated() {

        playlistEvents.emit(

            PlaylistEventTypes.UPDATED,

            {

                movies: this.getAll(),

                total: this.count(),

                currentIndex: this.currentIndex,

                nextUpIndex: this.nextUpIndex

            }

        );

    }


    /*==============================================
        Emit Next Up Changed
    ==============================================*/

    emitNextUpChanged() {

        playlistEvents.emit(

            PlaylistEventTypes.NEXT_UP_CHANGED,

            {

                movie: this.getNextUp(),

                index: this.nextUpIndex

            }

        );

    }

}


export const playlistService =

    new PlaylistService();