"use strict";

/*==================================================
    StreamFlix

    Playlist Controller

    Responsibility

    ✓ Expose playlist actions
    ✓ Coordinate PlaylistService
    ✓ Forward playlist events
    ✓ Manage completion state
    ✓ Manage Next Up state

    Business logic belongs to PlaylistService.

==================================================*/

import { playlistService }
from "./playlistService.js";

import { playlistEvents }
from "./playlistEvents.js";

import { PlaylistEventTypes }
from "./playlistEventTypes.js";


class PlaylistController {

    /*==============================================
        Initialize
    ==============================================*/

    init(movies = []) {

        playlistService.init(movies);

    }


    /*==============================================
        Add Movie
    ==============================================*/

    add(movie) {

        return playlistService.add(movie);

    }


    /*==============================================
        Remove Movie
    ==============================================*/

    remove(movieOrId) {

        return playlistService.remove(
            movieOrId
        );

    }


    /*==============================================
        Clear Playlist
    ==============================================*/

    clear() {

        playlistService.clear();

    }


    /*==============================================
        Set Current Movie
    ==============================================*/

    setCurrent(index) {

        return playlistService.setCurrent(
            index
        );

    }


    /*==============================================
        Get Current Movie
    ==============================================*/

    getCurrent() {

        return playlistService.getCurrent();

    }


    /*==============================================
        Get Current Index
    ==============================================*/

    getCurrentIndex() {

        return playlistService.getCurrentIndex();

    }


    /*==============================================
        Get All Movies
    ==============================================*/

    getAll() {

        return playlistService.getAll();

    }


    /*==============================================
        Get Movie
    ==============================================*/

    get(index) {

        return playlistService.get(index);

    }


    /*==============================================
        Get Count
    ==============================================*/

    count() {

        return playlistService.count();

    }


    /*==============================================
        Find Movie Index
    ==============================================*/

    indexOf(movieOrId) {

        return playlistService.indexOf(
            movieOrId
        );

    }


    /*==============================================
        Check Movie
    ==============================================*/

    has(movieOrId) {

        return playlistService.has(
            movieOrId
        );

    }


    /*==============================================
        Next
    ==============================================*/

    next() {

        return playlistService.next();

    }


    /*==============================================
        Previous
    ==============================================*/

    previous() {

        return playlistService.previous();

    }


    /*==============================================
        Mark Movie Completed
    ==============================================*/

    complete(index) {

        return playlistService.complete(
            index
        );

    }


    /*==============================================
        Mark Movie Incomplete
    ==============================================*/

    markIncomplete(index) {

        return playlistService.markIncomplete(
            index
        );

    }


    /*==============================================
        Check Completion
    ==============================================*/

    isCompleted(movieOrId) {

        return playlistService.isCompleted(
            movieOrId
        );

    }


    /*==============================================
        Get Completed Movies
    ==============================================*/

    getCompleted() {

        return playlistService.getCompleted();

    }


    /*==============================================
        Get Next Up
    ==============================================*/

    getNextUp() {

        return playlistService.getNextUp();

    }


    /*==============================================
        Get Next Up Index
    ==============================================*/

    getNextUpIndex() {

        return playlistService.getNextUpIndex();

    }


    /*==============================================
        Find Next Incomplete
    ==============================================*/

    findNextIncompleteIndex(index) {

        return playlistService.findNextIncompleteIndex(
            index
        );

    }


    /*==============================================
        Subscribe To Event
    ==============================================*/

    on(type, callback) {

        playlistEvents.on(
            type,
            callback
        );

    }


    /*==============================================
        Subscribe Once
    ==============================================*/

    once(type, callback) {

        playlistEvents.once(
            type,
            callback
        );

    }


    /*==============================================
        Unsubscribe
    ==============================================*/

    off(type, callback) {

        playlistEvents.off(
            type,
            callback
        );

    }


    /*==============================================
        Emit Event
    ==============================================*/

    emit(type, payload = null) {

        playlistEvents.emit(
            type,
            payload
        );

    }


    /*==============================================
        Event Types
    ==============================================*/

    get eventTypes() {

        return PlaylistEventTypes;

    }

}


export const playlistController =

    new PlaylistController();