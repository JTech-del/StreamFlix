"use strict";

/*==================================================
    StreamFlix

    Playlist Storage

    Responsibility

    ✓ Save playlist
    ✓ Load playlist
    ✓ Save current index
    ✓ Load current index
    ✓ Save completed movie state
    ✓ Load completed movie state
    ✓ Save next-up state
    ✓ Load next-up state
    ✓ Clear playlist storage

    Storage contains persistence only.
    Playlist business logic belongs to PlaylistService.

==================================================*/


class PlaylistStorage {

    constructor() {

        this.keys = Object.freeze({

            playlist: "streamflix-playlist",

            currentIndex: "streamflix-current-index",

            completed: "streamflix-playlist-completed",

            nextUp: "streamflix-playlist-next-up"

        });

    }


    /*==============================================
        Save Playlist
    ==============================================*/

    savePlaylist(movies = []) {

        if (!Array.isArray(movies)) {

            return;

        }


        try {

            localStorage.setItem(

                this.keys.playlist,

                JSON.stringify(movies)

            );

        } catch (error) {

            console.error(

                "Failed to save playlist.",

                error

            );

        }

    }


    /*==============================================
        Load Playlist
    ==============================================*/

    loadPlaylist() {

        const playlist =

            localStorage.getItem(

                this.keys.playlist

            );


        if (!playlist) {

            return [];

        }


        try {

            const parsed =

                JSON.parse(playlist);


            if (!Array.isArray(parsed)) {

                return [];

            }


            return parsed;

        } catch (error) {

            console.error(

                "Failed to load playlist.",

                error

            );

            return [];

        }

    }


    /*==============================================
        Save Current Index
    ==============================================*/

    saveCurrentIndex(index) {

        if (!Number.isInteger(index)) {

            return;

        }


        try {

            localStorage.setItem(

                this.keys.currentIndex,

                String(index)

            );

        } catch (error) {

            console.error(

                "Failed to save current playlist index.",

                error

            );

        }

    }


    /*==============================================
        Load Current Index
    ==============================================*/

    loadCurrentIndex() {

        const index =

            localStorage.getItem(

                this.keys.currentIndex

            );


        if (index === null) {

            return -1;

        }


        const parsedIndex =

            Number(index);


        if (!Number.isInteger(parsedIndex)) {

            return -1;

        }


        return parsedIndex;

    }


    /*==============================================
        Save Completed Movies
    ==============================================*/

    saveCompleted(completed = []) {

        if (!Array.isArray(completed)) {

            return;

        }


        try {

            localStorage.setItem(

                this.keys.completed,

                JSON.stringify(completed)

            );

        } catch (error) {

            console.error(

                "Failed to save completed playlist state.",

                error

            );

        }

    }


    /*==============================================
        Load Completed Movies
    ==============================================*/

    loadCompleted() {

        const completed =

            localStorage.getItem(

                this.keys.completed

            );


        if (!completed) {

            return [];

        }


        try {

            const parsed =

                JSON.parse(completed);


            if (!Array.isArray(parsed)) {

                return [];

            }


            return parsed;

        } catch (error) {

            console.error(

                "Failed to load completed playlist state.",

                error

            );

            return [];

        }

    }


    /*==============================================
        Save Next Up
    ==============================================*/

    saveNextUp(nextUp = null) {

        try {

            if (!nextUp) {

                localStorage.removeItem(

                    this.keys.nextUp

                );

                return;

            }


            localStorage.setItem(

                this.keys.nextUp,

                JSON.stringify(nextUp)

            );

        } catch (error) {

            console.error(

                "Failed to save next-up state.",

                error

            );

        }

    }


    /*==============================================
        Load Next Up
    ==============================================*/

    loadNextUp() {

        const nextUp =

            localStorage.getItem(

                this.keys.nextUp

            );


        if (!nextUp) {

            return null;

        }


        try {

            return JSON.parse(nextUp);

        } catch (error) {

            console.error(

                "Failed to load next-up state.",

                error

            );

            return null;

        }

    }


    /*==============================================
        Clear Storage
    ==============================================*/

    clear() {

        try {

            localStorage.removeItem(

                this.keys.playlist

            );


            localStorage.removeItem(

                this.keys.currentIndex

            );


            localStorage.removeItem(

                this.keys.completed

            );


            localStorage.removeItem(

                this.keys.nextUp

            );

        } catch (error) {

            console.error(

                "Failed to clear playlist storage.",

                error

            );

        }

    }

}


export const playlistStorage =

    new PlaylistStorage();