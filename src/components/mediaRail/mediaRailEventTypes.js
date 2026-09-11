"use strict";

/*==================================================
    StreamFlix Media Rail Event Types

    Responsibility:

    Defines all MediaRail event names.

    These events are shared by every MediaRail
    instance in StreamFlix.

    Supports:

    ✓ Existing Media Rail
    ✓ Recommended Rail
    ✓ New Releases Rail
    ✓ Watchlist Rail
    ✓ Trending Rail
    ✓ Future Media Rails

    Does NOT handle:

    ✗ Event listeners
    ✗ Event execution
    ✗ Movie business logic
    ✗ UI rendering
==================================================*/


export const MediaRailEventTypes =
    Object.freeze({


        /*==============================================
            Lifecycle
        ==============================================*/

        INITIALIZED: "mediaRail:initialized",


        DESTROYED: "mediaRail:destroyed",


        RENDERED: "mediaRail:rendered",



        /*==============================================
            Navigation
        ==============================================*/

        ITEM_CHANGED: "mediaRail:itemChanged",


        ITEM_FOCUSED: "mediaRail:itemFocused",


        ITEM_ACTIVATED: "mediaRail:itemActivated",


        NEXT: "mediaRail:next",


        PREVIOUS: "mediaRail:previous",



        /*==============================================
            Interaction
        ==============================================*/

        CLICK: "mediaRail:click",


        KEYBOARD: "mediaRail:keyboard",


        TOUCH: "mediaRail:touch",



        /*==============================================
            Movie Actions
        ==============================================*/

        THEATRE: "mediaRail:theatre",


        DOWNLOAD: "mediaRail:download",


        MY_LIST: "mediaRail:myList",



        /*==============================================
            Recommendation / Rail Context
        ==============================================*/

        ITEM_VIEWED: "mediaRail:itemViewed",


        ITEM_SELECTED: "mediaRail:itemSelected"

    });