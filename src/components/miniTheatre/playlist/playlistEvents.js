"use strict";

/*==================================================
    StreamFlix

    Playlist Events

    Responsibility

    ✓ Register listeners
    ✓ Register one-time listeners
    ✓ Remove listeners
    ✓ Emit events
    ✓ Clear listeners

    This module contains NO playlist business logic.

==================================================*/


class PlaylistEvents {

    constructor() {

        this.events = new Map();

    }


    /*==============================================
        Subscribe
    ==============================================*/

    on(type, callback) {

        if (
            typeof type !== "string" ||
            !type ||
            typeof callback !== "function"
        ) {

            return;

        }


        if (!this.events.has(type)) {

            this.events.set(type, new Set());

        }


        /*
        Set automatically prevents the same
        callback from being registered twice.
        */

        this.events
            .get(type)
            .add(callback);

    }


    /*==============================================
        Subscribe Once
    ==============================================*/

    once(type, callback) {

        if (
            typeof type !== "string" ||
            !type ||
            typeof callback !== "function"
        ) {

            return;

        }


        const wrapper = (payload) => {

            this.off(type, wrapper);

            callback(payload);

        };


        this.on(

            type,

            wrapper

        );

    }


    /*==============================================
        Unsubscribe
    ==============================================*/

    off(type, callback) {

        if (!this.events.has(type) ||
            typeof callback !== "function"
        ) {

            return;

        }


        const listeners =
            this.events.get(type);


        listeners.delete(callback);


        /*
        Remove empty event collections.
        */

        if (!listeners.size) {

            this.events.delete(type);

        }

    }


    /*==============================================
        Emit
    ==============================================*/

    emit(type, payload = null) {

        if (!this.events.has(type)) {

            return;

        }


        /*
        Create a snapshot before notifying
        listeners.

        This prevents problems when a listener
        removes itself or another listener while
        an event is being emitted.
        */

        const listeners = [

            ...this.events.get(type)

        ];


        listeners.forEach(

            listener => {

                try {

                    listener(payload);

                } catch (error) {

                    console.error(

                        `Playlist event "${type}" listener failed:`,

                        error

                    );

                }

            }

        );

    }


    /*==============================================
        Remove All
    ==============================================*/

    clear() {

        this.events.clear();

    }


    /*==============================================
        Remove All Listeners For Event
    ==============================================*/

    clearType(type) {

        if (!this.events.has(type)) {

            return;

        }


        this.events.delete(type);

    }

}


export const playlistEvents =

    new PlaylistEvents();