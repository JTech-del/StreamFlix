"use strict";

/*==================================================
    StreamFlix Media Rail Events

    Responsibility:

    ✓ Central MediaRail event bus
    ✓ Subscribe to events
    ✓ Unsubscribe from events
    ✓ Emit events
    ✓ Subscribe once
    ✓ Clear listeners

    Supports:

    ✓ Multiple independent Media Rails
    ✓ Recommendations Rail
    ✓ New Releases Rail
    ✓ Watchlist Rail
    ✓ Trending Rail
    ✓ Any future Media Rail

    Does NOT handle:

    ✗ UI rendering
    ✗ Movie business logic
    ✗ Theatre playback
    ✗ Download logic
    ✗ My List state
    ✗ Navigation logic
==================================================*/


class MediaRailEvents {


    /*==================================================
        Constructor
    ==================================================*/

    constructor() {

        this.listeners =
            new Map();

    }


    /*==================================================
        Subscribe
    ==================================================*/

    on(
        type,
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            return;

        }


        if (!type) {

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
        Unsubscribe
    ==================================================*/

    off(
        type,
        handler
    ) {

        const handlers =
            this.listeners.get(type);


        if (!handlers) {

            return;

        }


        handlers.delete(
            handler
        );


        if (
            handlers.size === 0
        ) {

            this.listeners.delete(
                type
            );

        }

    }


    /*==================================================
        Emit
    ==================================================*/

    emit(
        type,
        payload = null
    ) {

        const handlers =
            this.listeners.get(type);


        if (!handlers) {

            return;

        }


        handlers.forEach(

            handler => {

                try {

                    handler(payload);

                } catch (error) {

                    console.error(

                        `MediaRail event handler failed for "${type}":`,

                        error

                    );

                }

            }

        );

    }


    /*==================================================
        Subscribe Once
    ==================================================*/

    once(
        type,
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            return;

        }


        if (!type) {

            return;

        }


        const wrapper =
            payload => {

                try {

                    handler(payload);

                } finally {

                    this.off(

                        type,

                        wrapper

                    );

                }

            };


        this.on(

            type,

            wrapper

        );

    }


    /*==================================================
        Check Listeners
    ==================================================*/

    has(
        type
    ) {

        const handlers =
            this.listeners.get(type);


        return Boolean(

            handlers &&
            handlers.size

        );

    }


    /*==================================================
        Clear Event Type
    ==================================================*/

    clearType(
        type
    ) {

        if (!type) {

            return;

        }


        this.listeners.delete(
            type
        );

    }


    /*==================================================
        Clear All
    ==================================================*/

    clear() {

        this.listeners.clear();

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        this.clear();

    }

}


/*==================================================
    Public Exports
==================================================*/

export {

    MediaRailEvents

};


export const mediaRailEvents =
    new MediaRailEvents();