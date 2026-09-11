"use strict";

/*==================================================
    StreamFlix

    Watch Progress Events

    Responsibility

    ✓ Register listeners
    ✓ Remove listeners
    ✓ Emit events

==================================================*/

class WatchProgressEvents {

    constructor() {

        this.listeners = new Map();

    }

    /*==============================================
        Subscribe
    ==============================================*/

    on(event, callback) {

        if (!this.listeners.has(event)) {

            this.listeners.set(

                event,

                []

            );

        }

        this.listeners
            .get(event)
            .push(callback);

    }

    /*==============================================
        Unsubscribe
    ==============================================*/

    off(event, callback) {

        if (!this.listeners.has(event)) {

            return;

        }

        const callbacks =

            this.listeners.get(event);

        this.listeners.set(

            event,

            callbacks.filter(

                listener =>

                listener !== callback

            )

        );

    }

    /*==============================================
        Emit
    ==============================================*/

    emit(event, payload = {}) {

        if (!this.listeners.has(event)) {

            return;

        }

        this.listeners
            .get(event)
            .forEach(callback =>

                callback(payload)

            );

    }

}

export const watchProgressEvents =
    new WatchProgressEvents();