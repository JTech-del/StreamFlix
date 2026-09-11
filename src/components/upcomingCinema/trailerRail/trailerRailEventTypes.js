"use strict";


/*==================================================
    StreamFlix

    Trailer Rail Event Types

    Responsibility:

    ✓ Define Trailer Rail events
    ✓ Keep event names centralized
    ✓ Prevent event-name duplication

    Does NOT handle:

    ✕ Event listeners
    ✕ Event publishing
    ✕ DOM manipulation
    ✕ Trailer playback
==================================================*/


export const TrailerRailEventTypes = Object.freeze({

    /*------------------------------------------
        Navigation
    ------------------------------------------*/

    NEXT: "trailer-rail:next",


    PREVIOUS: "trailer-rail:previous",


    /*------------------------------------------
        Active Movie
    ------------------------------------------*/

    ACTIVE_CHANGED: "trailer-rail:active-changed",


    /*------------------------------------------
        Trailer Selection
    ------------------------------------------*/

    TRAILER_SELECTED: "trailer-rail:trailer-selected",


    /*------------------------------------------
        Watch Trailer
    ------------------------------------------*/

    WATCH_TRAILER: "trailer-rail:watch-trailer"

});