"use strict";

/*==================================================
    StreamFlix

    Upcoming Cinema Event Types
==================================================*/

export const UpcomingCinemaEventTypes =
    Object.freeze({

        /*------------------------------------------
            User selected Watch Trailer
        ------------------------------------------*/

        WATCH_TRAILER: "upcomingCinema:watchTrailer",


        /*------------------------------------------
            Controller resolved trailer
        ------------------------------------------*/

        TRAILER_SELECTED: "upcomingCinema:trailerSelected",


        /*------------------------------------------
    Open Selected Movie In Mini Theatre
------------------------------------------*/

        OPEN_MINI_THEATRE: "upcomingCinema:openMiniTheatre"

    });