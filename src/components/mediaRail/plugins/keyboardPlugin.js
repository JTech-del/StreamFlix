"use strict";

/*==================================================
    Keyboard Plugin

    Responsibility

    ✓ Keyboard Input
    ✓ Event Translation
==================================================*/

import { BasePlugin } from "../../plugins/BasePlugin.js";

import { mediaRailEvents } from "../mediaRailEvents.js";

export class KeyboardPlugin extends BasePlugin {

    constructor() {

        super();

        this.boundHandleKeyDown =

            this.handleKeyDown.bind(this);

    }

    /*==============================================
    Install
==============================================*/

    install(controller) {

            super.install(controller);

        }
        /*==============================================
    Enable
==============================================*/

    enable() {

            super.enable();

            document.addEventListener("keydown", this.boundHandleKeyDown);

        }
        /*==============================================
            Disable
        ==============================================*/

    disable() {

        document.removeEventListener(

            "keydown",

            this.boundHandleKeyDown

        );

        super.disable();

    }

    /*==============================================
    Handle Key Down
==============================================*/

    handleKeyDown(event) {

            switch (event.key) {

                case "ArrowRight":

                    mediaRailEvents.emit(

                        "navigate:next"

                    );

                    break;

                case "ArrowLeft":

                    mediaRailEvents.emit(

                        "navigate:previous"

                    );

                    break;

                case "Home":

                    mediaRailEvents.emit(

                        "navigate:first"

                    );

                    break;

                case "End":

                    mediaRailEvents.emit(

                        "navigate:last"

                    );

                    break;

                case "Enter":

                    mediaRailEvents.emit(

                        "item:activate"

                    );

                    break;

                case "Escape":

                    mediaRailEvents.emit(

                        "navigation:cancel"

                    );

                    break;

                default:

                    return;

            }

        }
        /*==============================================
            Destroy
        ==============================================*/

    destroy() {

        this.disable();

        super.destroy();

    }

}