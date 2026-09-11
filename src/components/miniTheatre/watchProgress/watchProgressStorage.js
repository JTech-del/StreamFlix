"use strict";

/*==================================================
    StreamFlix

    Watch Progress Storage

    Responsibility

    ✓ Save playback progress
    ✓ Load playback progress
    ✓ Remove playback progress
    ✓ Clear all progress

==================================================*/

class WatchProgressStorage {

    constructor() {

        this.key = "streamflix-watch-progress";

    }

    /*==============================================
        Save Progress
    ==============================================*/

    save(slug, currentTime) {

        if (!slug) {

            return;

        }

        const progress = this.getAll();

        progress[slug] = currentTime;

        localStorage.setItem(

            this.key,

            JSON.stringify(progress)

        );

    }

    /*==============================================
    Load Progress
==============================================*/

    load(slug) {

            if (!slug) {

                return 0;

            }

            const progress = this.getAll();

            if (progress[slug] === undefined) {

                return 0;

            }

            return progress[slug];

        }
        /*==============================================
            Remove Progress
        ==============================================*/

    remove(slug) {

        if (!slug) {

            return;

        }

        const progress = this.getAll();

        delete progress[slug];

        localStorage.setItem(

            this.key,

            JSON.stringify(progress)

        );

    }

    /*==============================================
        Get All Progress
    ==============================================*/

    getAll() {

        const data =

            localStorage.getItem(

                this.key

            );

        if (!data) {

            return {};

        }

        try {

            return JSON.parse(data);

        } catch (error) {

            console.error(

                "Failed to load watch progress.",

                error

            );

            return {};

        }

    }

    /*==============================================
        Clear Progress
    ==============================================*/

    clear() {

        localStorage.removeItem(

            this.key

        );

    }

}

export const watchProgressStorage =
    new WatchProgressStorage();