"use strict";

/*==================================================
    Subtitle Controller

    Responsibility:

    ✓ Initializes the subtitle system
    ✓ Coordinates subtitle modules
    ✓ Controls subtitle lifecycle

==================================================*/
import { subtitleState } from "./subtitleState.js";
class SubtitleController {

    constructor() {

        this.app = null;

        this.enabled = false;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(app) {

        this.app = app;

        console.log(

            "Subtitle Controller Initialized"

        );

    }

    /*==============================================
        Enable
    ==============================================*/

    enable() {

        subtitleState.enable();

    }

    /*==============================================
        Disable
    ==============================================*/

    disable() {

        subtitleState.disable();

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.app = null;

        this.enabled = false;

        subtitleState.reset();

        console.log(

            "Subtitle Controller Destroyed"

        );

    }

}

export const subtitleController =
    new SubtitleController();