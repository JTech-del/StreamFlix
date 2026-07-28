"use strict";

/*==================================================
    Subtitle State

    Responsibility:

    ✓ Stores subtitle state
    ✓ Provides state getters/setters
    ✓ Resets subtitle state

==================================================*/

class SubtitleState {

    constructor() {

        this.reset();

    }

    /*==============================================
        Reset State
    ==============================================*/

    reset() {

        this.enabled = false;

        this.language = "English";

        this.track = null;

        this.cues = [];

    }

    /*==============================================
        Enable
    ==============================================*/

    enable() {

        this.enabled = true;

    }

    /*==============================================
        Disable
    ==============================================*/

    disable() {

        this.enabled = false;

    }

    /*==============================================
        Set Language
    ==============================================*/

    setLanguage(language) {

        this.language = language;

    }

    /*==============================================
        Set Track
    ==============================================*/

    setTrack(track) {

        this.track = track;

    }

    /*==============================================
        Set Cues
    ==============================================*/

    setCues(cues = []) {

        this.cues = cues;

    }

}

export const subtitleState =
    new SubtitleState();