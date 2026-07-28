"use strict";

/*==================================================
    Media Rail Event Types

    Responsibility:
    Defines all MediaRail event names.

==================================================*/

export const MediaRailEventTypes = Object.freeze({

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

    TOUCH: "mediaRail:touch"

});