"use strict";

/*==================================================
    Touch Plugin

    Responsibility

    ✓ Touch Detection
    ✓ Gesture Recognition
==================================================*/

import { BasePlugin } from "../../plugins/BasePlugin.js";

import { mediaRailEvents } from "../mediaRailEvents.js";

import { MediaRailEventTypes } from "../mediaRailEventTypes.js";

export class TouchPlugin extends BasePlugin {

    constructor() {

        super();

        this.touchStartX = 0;

        this.touchEndX = 0;

        this.minimumSwipeDistance = 50;

        this.boundHandleTouchStart =
            this.handleTouchStart.bind(this);

        this.boundHandleTouchEnd =
            this.handleTouchEnd.bind(this);

    }
    install(controller) {

        super.install(controller);

        controller.navigate(MediaRailDirections.NEXT);

    }
    enable() {

        super.enable();

        const container =
            this.controller.config.container;

        container.addEventListener(

            "touchstart",

            this.boundHandleTouchStart,

            { passive: true }

        );

        container.addEventListener(

            "touchend",

            this.boundHandleTouchEnd,

            { passive: true }

        );

    }
    disable() {

        const container =
            this.controller.config.container;

        container.removeEventListener(

            "touchstart",

            this.boundHandleTouchStart

        );

        container.removeEventListener(

            "touchend",

            this.boundHandleTouchEnd

        );

        super.disable();

    }
    handleTouchStart(event) {

        this.touchStartX =

            event.changedTouches[0].clientX;

    }
    handleTouchEnd(event) {

        this.touchEndX =

            event.changedTouches[0].clientX;

        this.detectSwipe();

    }
    detectSwipe() {

        const distance =

            this.touchEndX -

            this.touchStartX;

        if (

            Math.abs(distance) <

            this.minimumSwipeDistance

        ) {

            return;

        }

        if (distance < 0) {

            mediaRailEvents.emit(

                MediaRailEventTypes.NAVIGATE_NEXT

            );

            return;

        }

        mediaRailEvents.emit(

            MediaRailEventTypes.NAVIGATE_PREVIOUS

        );

    }
}