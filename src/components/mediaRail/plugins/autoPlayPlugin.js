"use strict";

/*==================================================
    Autoplay Plugin

    Responsibility

    ✓ Timer Management
    ✓ Automatic Navigation

==================================================*/

import { BasePlugin } from "../../plugins/BasePlugin.js";

import { MediaRailDirections } from "../mediaRailDirections.js";

export class AutoplayPlugin extends BasePlugin {

    constructor() {

        super();

        this.timer = null;

        this.interval = 5000;

        this.paused = false;

    }

    /*==============================================
        Install
    ==============================================*/

    install(controller) {

        super.install(controller);

        if (controller.config.autoplayInterval) {

            this.interval =
                controller.config.autoplayInterval;

        }

    }

    /*==============================================
        Enable
    ==============================================*/

    enable() {

        super.enable();

        this.start();

    }

    /*==============================================
        Disable
    ==============================================*/

    disable() {

        this.stop();

        super.disable();

    }

    /*==============================================
        Start
    ==============================================*/

    start() {

        this.stop();

        this.timer = setInterval(() => {

            if (this.paused) {

                return;

            }

            this.controller.navigate(

                MediaRailDirections.NEXT

            );

        }, this.interval);

    }

    /*==============================================
        Stop
    ==============================================*/

    stop() {

        if (!this.timer) {

            return;

        }

        clearInterval(this.timer);

        this.timer = null;

    }

    /*==============================================
        Pause
    ==============================================*/

    pause() {

        this.paused = true;

    }

    /*==============================================
        Resume
    ==============================================*/

    resume() {

        this.paused = false;

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.stop();

        super.destroy();

    }

}