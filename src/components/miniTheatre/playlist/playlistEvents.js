"use strict";

/*==================================================
    StreamFlix

    Playlist Events

    Responsibility

    ✓ Register listeners
    ✓ Remove listeners
    ✓ Emit events
    ✓ Clear listeners

==================================================*/

class PlaylistEvents {

    constructor() {

        this.events = new Map();

    }

    /*==============================================
        Subscribe
    ==============================================*/

    on(type, callback) {

        if (!this.events.has(type)) {

            this.events.set(type, []);

        }

        this.events.get(type).push(callback);

    }

    /*==============================================
        Subscribe Once
    ==============================================*/

    once(type, callback) {

        const wrapper = (payload) => {

            callback(payload);

            this.off(type, wrapper);

        };

        this.on(type, wrapper);

    }

    /*==============================================
        Unsubscribe
    ==============================================*/

    off(type, callback) {

        if (!this.events.has(type)) {

            return;

        }

        const listeners = this.events.get(type);

        this.events.set(

            type,

            listeners.filter(

                listener => listener !== callback

            )

        );

    }

    /*==============================================
        Emit
    ==============================================*/

    emit(type, payload = null) {

        if (!this.events.has(type)) {

            return;

        }

        this.events.get(type).forEach(

            listener => listener(payload)

        );

    }

    /*==============================================
        Remove All
    ==============================================*/

    clear() {

        this.events.clear();

    }

}

export const playlistEvents =
    new PlaylistEvents();