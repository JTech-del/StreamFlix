"use strict";

/*==================================================
    StreamFlix

    Playlist Event Types

    Responsibility

    ✓ Playlist lifecycle
    ✓ Playlist mutations
    ✓ Current movie updates
    ✓ Playlist navigation
    ✓ Playback state updates
    ✓ Completion / Next Up state

==================================================*/

export const PlaylistEventTypes = Object.freeze({

    /*----------------------------------------------
        Lifecycle
    ----------------------------------------------*/

    INITIALIZED: "playlist:initialized",

    UPDATED: "playlist:updated",

    CLEARED: "playlist:cleared",


    /*----------------------------------------------
        Playlist
    ----------------------------------------------*/

    MOVIE_ADDED: "playlist:movie-added",

    MOVIE_REMOVED: "playlist:movie-removed",


    /*----------------------------------------------
        Current Movie
    ----------------------------------------------*/

    CURRENT_CHANGED: "playlist:current-changed",


    /*----------------------------------------------
        Playback State
    ----------------------------------------------*/

    STATE_CHANGED: "playlist:state-changed",

    MOVIE_PLAYING: "playlist:movie-playing",

    MOVIE_PAUSED: "playlist:movie-paused",

    MOVIE_COMPLETED: "playlist:movie-completed",


    /*----------------------------------------------
        Next Up
    ----------------------------------------------*/

    NEXT_UP_CHANGED: "playlist:next-up-changed",


    /*----------------------------------------------
        Navigation
    ----------------------------------------------*/

    NEXT: "playlist:next",

    PREVIOUS: "playlist:previous"

});