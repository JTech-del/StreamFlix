"use strict";

/*==================================================
    StreamFlix

    Playlist Controller

    Responsibility

    ✓ Coordinate playlist service
    ✓ Expose playlist API
    ✓ No UI rendering

==================================================*/

import { playlistService } from "./playlistService.js";

class PlaylistController {

    constructor() {

        this.initialized = false;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

    }

    /*==============================================
        Public API
    ==============================================*/

    add(movie) {

        playlistService.add(movie);

    }

    remove(movieId) {

        playlistService.remove(movieId);

    }

    clear() {

        playlistService.clear();

    }

    setCurrent(index) {

        playlistService.setCurrent(index);

    }

    next() {

        return playlistService.next();

    }

    previous() {

        return playlistService.previous();

    }

    get(index) {

        return playlistService.get(index);

    }

    getCurrent() {

        return playlistService.getCurrent();

    }

    getAll() {

        return playlistService.getAll();

    }

    count() {

        return playlistService.count();

    }

    indexOf(slug) {

        return playlistService
            .getAll()
            .findIndex(

                movie => movie.slug === slug

            );

    }

}

export const playlistController =
    new PlaylistController();