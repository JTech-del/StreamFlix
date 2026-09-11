"use strict";

/*==================================================
    StreamFlix

    Trailer Rail Events

    Responsibility:

    ✓ Provide a local event bus for Trailer Rail
    ✓ Register event listeners
    ✓ Remove event listeners
    ✓ Emit Trailer Rail events

    Does NOT handle:

    ✗ DOM manipulation
    ✗ Movie data
    ✗ Trailer playback
    ✗ Mini Theatre
    ✗ Application state
==================================================*/


/*==================================================
    Trailer Rail Event Bus
==================================================*/

class TrailerRailEvents {


    constructor() {

        this.listeners = new Map();

    }



    /*==================================================
        On
    ==================================================*/

    on(type, handler) {

        if (!type ||
            typeof handler !== "function"
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
            .add(handler);

    }



    /*==================================================
        Off
    ==================================================*/

    off(type, handler = null) {

        if (!this.listeners.has(type)) {

            return;

        }


        /*
            Remove one specific handler
        */

        if (
            handler
        ) {

            this.listeners
                .get(type)
                .delete(handler);

            return;

        }


        /*
            Remove every handler
            for this event type
        */

        this.listeners.delete(type);

    }



    /*==================================================
        Emit
    ==================================================*/

    emit(type, payload = {}) {

        if (!this.listeners.has(type)) {

            return;

        }


        const handlers = [

            ...this.listeners
            .get(type)

        ];


        handlers.forEach(

            handler => {

                try {

                    handler(payload);

                } catch (error) {

                    console.error(

                        `Trailer Rail event "${type}" failed:`,

                        error

                    );

                }

            }

        );

    }



    /*==================================================
        Clear
    ==================================================*/

    clear() {

        this.listeners.clear();

    }

}



/*==================================================
    Singleton
==================================================*/

export const trailerRailEvents =

    new TrailerRailEvents();