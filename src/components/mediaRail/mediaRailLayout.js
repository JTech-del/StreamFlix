"use strict";

/*==================================================
    Media Rail Layout

    Responsibility:
    Defines the structural metadata used by
    the MediaRail rendering engine.

==================================================*/

export const mediaRailLayout = {

    /*==============================================
        CSS Selectors
    ==============================================*/

    selectors: {

        container: ".mediaRail",

        track: ".mediaRail__track",

        item: ".mediaRail__item"

    },

    /*==============================================
        CSS State Classes
    ==============================================*/

    classes: {

        active: "is-active",

        focused: "is-focused",

        animating: "is-animating",

        disabled: "is-disabled"

    },

    /*==============================================
        Data Attributes
    ==============================================*/

    attributes: {

        slug: "data-slug",

        index: "data-index",

        id: "data-id"

    }

};