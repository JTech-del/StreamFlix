"use strict";

/*==================================================
    StreamFlix

    Playlist Event Types

    Responsibility

    ✓ Playlist lifecycle
    ✓ Playlist mutations
    ✓ Current movie updates
    ✓ Playlist navigation

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
        Navigation
    ----------------------------------------------*/

    NEXT: "playlist:next",

    PREVIOUS: "playlist:previous"

});