"use strict";

/*==================================================
    StreamFlix

    Upcoming Cinema Events

    Responsibility:

    ✓ Publish Upcoming Cinema events
    ✓ Allow other application systems to listen
    ✓ Manage event subscriptions

    Does NOT handle:

    ✗ Mini Theatre
    ✗ Playback
    ✗ DOM
    ✗ Application state

==================================================*/

class UpcomingCinemaEvents {

    constructor() {

        this.listeners = new Map();

    }


    /*==============================================
        Subscribe
    ==============================================*/

    on(type, callback) {

        if (!type ||
            typeof callback !== "function"
        ) {

            return;

        }


        if (!this.listeners.has(type)) {

            this.listeners.set(

                type,

                new Set()

            );

        }


        this.listeners
            .get(type)
            .add(callback);

    }


    /*==============================================
        Emit
    ==============================================*/

    emit(type, payload = {}) {

        const callbacks =

            this.listeners.get(type);


        if (!callbacks) {

            return;

        }


        callbacks.forEach(

            callback => {

                try {

                    callback(payload);

                } catch (error) {

                    console.error(

                        `Upcoming Cinema event "${type}" failed:`,

                        error

                    );

                }

            }

        );

    }


    /*==============================================
        Remove Listener
    ==============================================*/

    off(type, callback) {

        const callbacks =

            this.listeners.get(type);


        if (!callbacks) {

            return;

        }


        /*
        ------------------------------------------
            Remove All Listeners
        ------------------------------------------

            off(type)

        ------------------------------------------
        */

        if (
            typeof callback !== "function"
        ) {

            this.listeners.delete(type);

            return;

        }


        /*
        ------------------------------------------
            Remove Specific Listener
        ------------------------------------------
        */

        callbacks.delete(callback);


        /*
        ------------------------------------------
            Remove Empty Event
        ------------------------------------------
        */

        if (!callbacks.size) {

            this.listeners.delete(type);

        }

    }


    /*==============================================
        Clear All Events
    ==============================================*/

    clear() {

        this.listeners.clear();

    }

}


/*==============================================
    Export Singleton
==============================================*/

export const upcomingCinemaEvents =

    new UpcomingCinemaEvents();