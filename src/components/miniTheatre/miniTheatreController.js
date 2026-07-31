"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Controller

    Responsibility

    ✓ Initialize Mini Theatre
    ✓ Listen for MediaRail events
    ✓ Listen for Playlist events
    ✓ Coordinate View
    ✓ Keep current movie state

==================================================*/

import { mediaRailEvents } from "../mediaRail/mediaRailEvents.js";
import { MediaRailEventTypes } from "../mediaRail/mediaRailEventTypes.js";

import { playlistEvents } from "./playlist/playlistEvents.js";
import { PlaylistEventTypes } from "./playlist/playlistEventTypes.js";

import { playlistController } from "./playlist/playlistController.js";

import { miniTheatreView } from "./miniTheatreView.js";

class MiniTheatreController {

    constructor() {

        this.currentMovie = null;

        this.currentIndex = -1;

        this.isPlaying = false;

    }

    /*==============================================
    Initialize
==============================================*/

    init(container) {

            miniTheatreView.init(

                container

            );

            playlistController.init();

            miniTheatreView.bindPlaylistClick(

                this.handlePlaylistClick.bind(this)

            );

            this.bindEvents();

        }
        /*==============================================
            Handle Playlist Click
        ==============================================*/

    handlePlaylistClick(index) {

            playlistController.setCurrent(

                index

            );

        }
        /*==============================================
            Bind Events
        ==============================================*/

    bindEvents() {

        /*------------------------------------------
            MediaRail → Playlist
        ------------------------------------------*/

        mediaRailEvents.on(

            MediaRailEventTypes.MOVIE_SELECTED,

            ({ movie }) => {

                this.play(movie);

            }

        );

        /*------------------------------------------
            Playlist → Mini Theatre
        ------------------------------------------*/

        playlistEvents.on(

            PlaylistEventTypes.CURRENT_CHANGED,

            ({ movie, index }) => {

                this.currentMovie = movie;

                this.currentIndex = index;

                this.updateTheatre();

            }

        );

        /*------------------------------------------
            Playlist Updated
        ------------------------------------------*/

        playlistEvents.on(

            PlaylistEventTypes.UPDATED,

            ({ movies }) => {

                miniTheatreView.renderPlaylist(

                    movies

                );

            }

        );

        /*------------------------------------------
    Mini Theatre Controls
------------------------------------------*/
        /** *

                miniTheatreView.bindPlay(

                    () => this.startPlayback()

                );

                miniTheatreView.bindResume(

                    () => this.resumePlayback()

                );

                miniTheatreView.bindRemove(

                    () => this.removeCurrentMovie()

                );
                */

    }


    /*==============================================
        Play Movie
    ==============================================*/

    play(movie) {

            /*Tempora */
            console.log(
                movie.title,
                movie.video
            );

            if (!movie) {

                return;

            }

            playlistController.add(movie);

            const index =

                playlistController.indexOf(

                    movie.slug

                );

            playlistController.setCurrent(index);
            /*
                        this.startPlayback();
                        */

        }
        /*==============================================
            Start Playback
        ==============================================*/

    async startPlayback() {
            /* tempory*/
            console.log("▶ startPlayback()");



            if (!this.currentMovie) {

                return;

            }
            /*
                        miniTheatreView.showVideo();
            */
            console.log("Calling showVideo...");
            console.log(miniTheatreView);

            miniTheatreView.showVideo();

            console.log("Returned from showVideo");


            await miniTheatreView.playVideo();

            this.isPlaying = true;

        }
        /*==============================================
    Pause Playback
==============================================*/

    pausePlayback() {

            miniTheatreView.pauseVideo();

            this.isPlaying = false;

        }
        /*==============================================
    Resume Playback
==============================================*/

    async resumePlayback() {

            if (!this.currentMovie) {

                return;

            }

            await miniTheatreView.playVideo();

            this.isPlaying = true;

        }
        /*==============================================
    Stop Playback
==============================================*/

    stopPlayback() {

        miniTheatreView.resetVideo();

        miniTheatreView.showPoster();

        this.isPlaying = false;

    }

    /*==============================================
    Remove Current Movie
==============================================*/

    removeCurrentMovie() {

        if (!this.currentMovie) {

            return;

        }

        playlistController.remove(

            this.currentMovie.id

        );

        this.stopPlayback();

        this.currentMovie = null;

        this.currentIndex = -1;

        miniTheatreView.clear();

    }


    /*==============================================
    Update Theatre
==============================================*/

    updateTheatre() {

            if (!this.currentMovie) {

                return;

            }

            miniTheatreView.renderMovie(this.currentMovie);

            /*
            Rebind controls because renderMovie()
            creates brand-new DOM elements.
            */

            miniTheatreView.bindPlay(
                () => this.startPlayback()
            );

            miniTheatreView.bindResume(
                () => this.resumePlayback()
            );

            miniTheatreView.bindRemove(
                () => this.removeCurrentMovie()
            );

            miniTheatreView.setActive(
                this.currentIndex
            );

            miniTheatreView.scrollToActive(
                this.currentIndex
            );

            /*
            Always reset playback when
            switching to a new movie.
            */

            this.stopPlayback();

        }
        /*==============================================
            Update Theatre
        ==============================================*
    updateTheatre() {

        if (!this.currentMovie) {

            return;

        }

        miniTheatreView.renderMovie( this.currentMovie );

        miniTheatreView.setActive(this.currentIndex );

        miniTheatreView.scrollToActive(this.currentIndex);

        /*
        Always reset playback when
        switching to a new movie.
        *

        this.stopPlayback();

    }
*/

    /*==============================================
        Public API
    ==============================================*/

    clear() {

        playlistController.clear();

        this.currentMovie = null;

        this.currentIndex = -1;

        miniTheatreView.clear();

    }

}

export const miniTheatreController =
    new MiniTheatreController();