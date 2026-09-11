"use strict";

/*==================================================
    StreamFlix

    Watch Progress Controller

    Responsibility

    ✓ Save playback progress
    ✓ Restore playback progress
    ✓ Clear playback progress

==================================================*/

import { watchProgressStorage } from "./watchProgressStorage.js";

import { watchProgressEvents } from "./watchProgressEvents.js";

import { WatchProgressEventTypes } from "./watchProgressEventTypes.js";
class WatchProgressController {

    constructor() {

        this.video = null;

        this.movie = null;

        this.saveInterval = null;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(videoElement) {

            this.video = videoElement;

            this.video.ontimeupdate = () => {

                if (

                    !this.video.duration ||

                    !this.movie

                ) {

                    return;

                }

                const progress =

                    (this.video.currentTime /

                        this.video.duration) * 100;

                watchProgressEvents.emit(

                    WatchProgressEventTypes.UPDATED,

                    {

                        movie: this.movie,

                        currentTime:

                            this.video.currentTime,

                        progress

                    }

                );

            };

            if (!this.video) {

                return;

            }

            this.video.onended = () => {

                /*
                Save final state.
                */

                this.stopAutoSave();

                /*
                Remove completed progress.
                */

                this.clear();

            };

        }
        /*==============================================
            Set Current Movie
        ==============================================*/

    setMovie(movie) {

            this.movie = movie;

        }
        /*==============================================
    Start Auto Save
==============================================*/

    startAutoSave() {

        if (!this.video) {

            return;

        }

        this.stopAutoSave();

        this.saveInterval =

            setInterval(() => {

                this.save();

            }, 5000);

    }

    /*==============================================
    Stop Auto Save
==============================================*/

    stopAutoSave() {

            if (!this.saveInterval) {

                return;

            }

            clearInterval(

                this.saveInterval

            );

            this.saveInterval = null;

        }
        /*==============================================
    Save Progress
==============================================*/

    save() {

        if (

            !this.video ||

            !this.movie

        ) {

            return;

        }

        const currentTime =

            this.video.currentTime;

        watchProgressStorage.save(

            this.movie.slug,

            currentTime

        );

        watchProgressEvents.emit(

            WatchProgressEventTypes.SAVED,

            {

                movie: this.movie,

                currentTime

            }

        );

    }

    /*==============================================
    Restore Progress
==============================================*/

    restore() {

        if (

            !this.video ||

            !this.movie

        ) {

            return;

        }

        const savedTime =

            this.getProgress();

        if (

            savedTime <= 0

        ) {

            return;

        }

        /*
        Restore only after metadata
        is available.
        */

        const restorePlayback = () => {

            if (

                !this.video ||

                !this.video.duration

            ) {

                return;

            }

            /*
            Do not restore beyond
            the end of the video.
            */

            if (

                savedTime < this.video.duration

            ) {

                this.video.currentTime =

                    savedTime;

            }

            /*
            Calculate the actual
            restored percentage.
            */

            const progress =

                (

                    this.video.currentTime /

                    this.video.duration

                ) * 100;

            watchProgressEvents.emit(

                WatchProgressEventTypes.RESTORED,

                {

                    movie: this.movie,

                    currentTime:

                        this.video.currentTime,

                    progress

                }

            );

        };

        /*
        Metadata already available.
        */

        if (

            this.video.readyState >= 1

        ) {

            restorePlayback();

            return;

        }

        /*
        Otherwise wait for metadata.
        */

        this.video.onloadedmetadata =

            restorePlayback;

    }

    /*==============================================
        Get Progress
    ==============================================*/

    getProgress() {

        if (!this.movie) {

            return 0;

        }

        return watchProgressStorage.load(

            this.movie.slug

        );

    }






    /*==============================================
    Clear Progress
==============================================*/

    clear() {

        if (!this.movie) {

            return;

        }

        watchProgressStorage.remove(

            this.movie.slug

        );

        watchProgressEvents.emit(

            WatchProgressEventTypes.CLEARED,

            {

                movie: this.movie

            }

        );

        this.reset();

    }

    /*==============================================
    Reset
==============================================*/

    reset() {

        this.stopAutoSave();

        this.video = null;

        this.movie = null;

    }
}

export const watchProgressController =
    new WatchProgressController();