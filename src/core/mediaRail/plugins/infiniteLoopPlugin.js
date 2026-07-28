"use strict";

/*==================================================
    Infinite Loop Plugin

    Responsibility

    ✓ Endless Navigation
==================================================*/

import { BasePlugin } from "../../plugins/BasePlugin.js";

import { mediaRailEvents } from "../mediaRailEvents.js";

import { MediaRailEventTypes } from "../mediaRailEventTypes.js";

export class InfiniteLoopPlugin extends BasePlugin {

    constructor() {

        super();

        this.enabled = true;

    }

    install(controller) {

        super.install(controller);

        mediaRailEvents.on(

            MediaRailEventTypes.NAVIGATION_END,

            this.handleNavigationEnd.bind(this)

        );

    }

    handleNavigationEnd(payload) {

        if (!this.enabled) {

            return;

        }

        const total =

            this.controller.service

            .getTotalItems();

        if (payload.index >= total) {

            mediaRailEvents.emit(

                MediaRailEventTypes.LOOP_FORWARD

            );

            return;

        }

        if (payload.index < 0) {

            mediaRailEvents.emit(

                MediaRailEventTypes.LOOP_BACKWARD

            );

        }

    }

}