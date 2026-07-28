"use strict";

/*==================================================
    Media Rail Events

    Responsibility:
    Event Bus for the MediaRail Engine.

==================================================*/

class MediaRailEvents {

    constructor() {

        this.listeners = new Map();

    }

    /*==============================================
        Subscribe
    ==============================================*/

    on(type, handler) {

        if (!this.listeners.has(type)) {

            this.listeners.set(

                type,

                new Set()

            );

        }

        this.listeners.get(type)

        .add(handler);

    }

    /*==============================================
        Unsubscribe
    ==============================================*/

    off(type, handler) {

        const handlers =

            this.listeners.get(type);

        if (!handlers) {

            return;

        }

        handlers.delete(handler);

    }

    /*==============================================
        Emit
    ==============================================*/

    emit(type, payload = null) {

        const handlers =

            this.listeners.get(type);

        if (!handlers) {

            return;

        }

        handlers.forEach(handler => {

            handler(payload);

        });

    }

    /*==============================================
        Subscribe Once
    ==============================================*/

    once(type, handler) {

        const wrapper = payload => {

            handler(payload);

            this.off(type, wrapper);

        };

        this.on(type, wrapper);

    }

    /*==============================================
        Clear
    ==============================================*/

    clear() {

        this.listeners.clear();

    }

}

export const mediaRailEvents =
    new MediaRailEvents();