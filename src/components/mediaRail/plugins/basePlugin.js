"use strict";

/*==================================================
    Base Plugin

    Responsibility

    ✓ Common Plugin Lifecycle
==================================================*/

export class BasePlugin {

    constructor() {

        this.controller = null;

        this.enabled = false;

    }

    /*==============================================
        Install
    ==============================================*/

    install(controller) {

        this.controller = controller;

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
        Destroy
    ==============================================*/

    destroy() {

        this.disable();

        this.controller = null;

    }

}