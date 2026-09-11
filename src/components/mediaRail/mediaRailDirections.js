/*
"use strict";

/*==================================================
    Media Rail Directions

    Responsibility:
    Defines all supported navigation
    directions for the MediaRail engine.

==================================================*/
/*
export const MediaRailDirections = Object.freeze({

    NEXT: "next",

    PREVIOUS: "previous",

    HOME: "home",

    END: "end",

    RANDOM: "random"

});

*/

"use strict";

/*==================================================
    Media Rail Directions

    Responsibility:

    Provides the supported navigation directions
    for the Media Rail system.

    Does NOT handle:

    ✗ Navigation logic
    ✗ DOM manipulation
    ✗ Event handling
    ✗ State management
    ✗ UI rendering

==================================================*/

const MediaRailDirections = Object.freeze({

    NEXT: "next",

    PREVIOUS: "previous"

});


/*==================================================
    Public Media Rail Directions
==================================================*/

export {

    MediaRailDirections

};