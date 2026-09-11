"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Playback Controller V3

    Responsibility

    ✓ Manage playback lifecycle
    ✓ Coordinate playlist playback state
    ✓ Coordinate watch progress
    ✓ Manage completed state
    ✓ Synchronize active playlist card
    ✓ Support temporary trailer playback
    ✓ Restore previous playback after trailer
    ✓ Handle movie removal
    ✓ Prevent stale playback requests
    ✓ No direct business UI logic

==================================================*/

import { miniTheatreView }
from "../miniTheatreView.js";

import { playlistController }
from "../playlist/playlistController.js";

import { watchProgressController }
from "../watchProgress/watchProgressController.js";


class MiniTheatrePlaybackController {


    /*==================================================
        Constructor
    ==================================================*/

    constructor() {

        this.state = {

            movie: null,

            index: -1,

            isPlaying: false,

            isPaused: false,

            isCompleted: false,

            progress: 0

        };


        /*
        ----------------------------------------------
            Temporary Trailer State
        ----------------------------------------------
        */

        this.temporaryTrailer = null;


        /*
        ----------------------------------------------
            Playback Request Guard
        ----------------------------------------------

        Used to invalidate stale async play requests.
        */

        this.playbackRequest = 0;

    }


    /*==================================================
        Play
    ==================================================*/

    async play(movie) {

        if (!movie) {

            return false;

        }

        return this.handleMovieSelected(movie);

    }


    /*==================================================
        Handle Movie Selected
    ==================================================*/

    async handleMovieSelected(movie) {

        if (!movie) {

            return false;

        }


        /*
        ----------------------------------------------
            Capture Existing Playback
        ----------------------------------------------
        */

        const previous =
            this.captureCurrentPlayback();


        /*
        ----------------------------------------------
            Stop Existing Playback
        ----------------------------------------------
        */

        this.stopCurrentPlayback();


        /*
        ----------------------------------------------
            Find Movie In Playlist
        ----------------------------------------------
        */

        let index =
            playlistController.indexOf(movie);


        /*
        ----------------------------------------------
            Add Movie If Missing
        ----------------------------------------------
        */

        if (index === -1) {

            const added =
                playlistController.add(movie);


            if (!added) {

                console.error(
                    "Mini Theatre: Failed to add movie to playlist.",
                    movie
                );

                this.restoreCapturedState(previous);

                return false;

            }


            index =
                playlistController.indexOf(movie);

        }


        /*
        ----------------------------------------------
            Validate Index
        ----------------------------------------------
        */

        if (!Number.isInteger(index) ||
            index < 0
        ) {

            console.error(
                "Mini Theatre: Movie could not be located in playlist.",
                movie
            );

            this.restoreCapturedState(previous);

            return false;

        }


        /*
        ----------------------------------------------
            Activate Playlist Movie
        ----------------------------------------------
        */

        const activeMovie =
            playlistController.setCurrent(index);


        if (!activeMovie) {

            console.error(
                "Mini Theatre: Failed to activate playlist movie.",
                movie
            );

            this.restoreCapturedState(previous);

            return false;

        }


        /*
        ----------------------------------------------
            Update Playback State
        ----------------------------------------------
        */

        this.state.movie =
            activeMovie;

        this.state.index =
            index;

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            playlistController.isCompleted(
                activeMovie
            );

        this.state.progress =
            this.state.isCompleted ?
            100 :
            0;


        /*
        ----------------------------------------------
            Update Previous Card
        ----------------------------------------------
        */

        if (
            previous &&
            previous.index !== -1 &&
            previous.index !== index
        ) {

            this.updatePreviousCard(previous);

        }


        /*
        ----------------------------------------------
            Render Movie
        ----------------------------------------------
        */

        this.renderCurrentMovie();


        /*
        ----------------------------------------------
            Completed Movies
        ----------------------------------------------
        */

        if (this.state.isCompleted) {

            this.state.progress = 100;

            this.syncActiveCard();

            return true;

        }


        /*
        ----------------------------------------------
            Start Playback
        ----------------------------------------------
        */

        return this.startPlayback();

    }


    /*==================================================
        Render Current Movie
    ==================================================*/

    renderCurrentMovie() {

        const movie =
            this.state.movie;


        if (!movie) {

            miniTheatreView.renderEmpty();

            return;

        }


        /*
        ----------------------------------------------
            Render Movie
        ----------------------------------------------
        */

        miniTheatreView.renderMovie(
            movie
        );


        /*
        ----------------------------------------------
            Bind Ended Event
        ----------------------------------------------
        */

        miniTheatreView.bindEnded(
            () => this.handlePlaybackEnded()
        );


        /*
        ----------------------------------------------
            Active Playlist Card
        ----------------------------------------------
        */

        miniTheatreView.setActive(
            this.state.index
        );


        miniTheatreView.scrollToActive(
            this.state.index
        );


        /*
        ----------------------------------------------
            Initialise Watch Progress
        ----------------------------------------------
        */

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            this.syncActiveCard();

            return;

        }


        watchProgressController.init(
            video
        );


        watchProgressController.setMovie(
            movie
        );


        /*
        ----------------------------------------------
            Restore Saved Progress
        ----------------------------------------------
        */

        watchProgressController.restore();


        const progress =
            watchProgressController.getProgress();


        if (Number.isFinite(progress)) {

            this.state.progress =
                Math.max(
                    0,
                    Math.min(
                        100,
                        progress
                    )
                );

        }


        /*
        ----------------------------------------------
            Resume Prompt
        ----------------------------------------------
        */

        if (this.hasResumeProgress()) {

            miniTheatreView.showResumePrompt(
                this.state.progress
            );

        }


        /*
        ----------------------------------------------
            Synchronize Card
        ----------------------------------------------
        */

        this.syncActiveCard();

    }


    /*==================================================
        Start Playback
    ==================================================*/

    async startPlayback() {

        const movie =
            this.state.movie;


        if (!movie) {

            return false;

        }


        /*
        ----------------------------------------------
            Completed Movie Guard
        ----------------------------------------------
        */

        if (
            this.state.isCompleted ||
            playlistController.isCompleted(movie)
        ) {

            this.state.isCompleted =
                true;

            this.state.isPlaying =
                false;

            this.state.isPaused =
                false;

            this.state.progress =
                100;

            this.syncActiveCard();

            return false;

        }


        /*
        ----------------------------------------------
            Video
        ----------------------------------------------
        */

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return false;

        }


        /*
        ----------------------------------------------
            Create Request ID
        ----------------------------------------------
        */

        const requestId =
            ++this.playbackRequest;


        /*
        ----------------------------------------------
            Restore Progress
        ----------------------------------------------
        */

        watchProgressController.restore();


        /*
        ----------------------------------------------
            Start Video
        ----------------------------------------------
        */

        let started = false;


        try {

            started =
                await miniTheatreView.playVideo();

        } catch (error) {

            console.error(
                "Mini Theatre: Playback failed.",
                error
            );

            return false;

        }


        /*
        ----------------------------------------------
            Ignore Stale Request
        ----------------------------------------------
        */

        if (
            requestId !==
            this.playbackRequest
        ) {

            return false;

        }


        if (!started) {

            this.state.isPlaying =
                false;

            this.state.isPaused =
                false;

            this.syncActiveCard();

            return false;

        }


        /*
        ----------------------------------------------
            Playback Active
        ----------------------------------------------
        */

        this.state.isPlaying =
            true;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            false;


        /*
        ----------------------------------------------
            Persist Progress
        ----------------------------------------------
        */

        watchProgressController.startAutoSave();


        this.syncActiveCard();


        return true;

    }


    /*==================================================
        Pause Playback
    ==================================================*/

    pausePlayback() {

        if (!this.state.movie) {

            return false;

        }


        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return false;

        }


        /*
        ----------------------------------------------
            Pause Video
        ----------------------------------------------
        */

        miniTheatreView.pauseVideo();


        /*
        ----------------------------------------------
            Save Progress
        ----------------------------------------------
        */

        watchProgressController.save();

        watchProgressController.stopAutoSave();


        /*
        ----------------------------------------------
            Update State
        ----------------------------------------------
        */

        this.state.isPlaying =
            false;

        this.state.isPaused =
            true;

        this.state.isCompleted =
            false;


        this.updateStateProgress();

        this.syncActiveCard();


        return true;

    }


    /*==================================================
        Resume Playback
    ==================================================*/

    async resumePlayback() {

        if (!this.state.movie) {

            return false;

        }


        /*
        ----------------------------------------------
            Completed Guard
        ----------------------------------------------
        */

        if (
            this.state.isCompleted ||
            playlistController.isCompleted(
                this.state.movie
            )
        ) {

            return false;

        }


        const started =
            await this.startPlayback();


        if (!started) {

            return false;

        }


        return true;

    }


    /*==================================================
        Stop Playback
    ==================================================*/

    stopPlayback() {

        this.stopCurrentPlayback();


        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            false;


        this.updateStateProgress();

        this.syncActiveCard();

    }


    /*==================================================
        Stop Current Playback
    ==================================================*/

    stopCurrentPlayback() {

            /*
            ----------------------------------------------
                Invalidate Pending Requests
            ----------------------------------------------
            */

            this.playbackRequest++;


            /*
            ----------------------------------------------
                Save Progress
            ----------------------------------------------
            */

            if (this.state.movie) {

                try {

                    watchProgressController.save();

                } catch (error) {

                    console.warn(
                        "Mini Theatre: Failed to save watch progress.",
                        error
                    );

                }

            }


            watchProgressController.stopAutoSave();


            /*
            ----------------------------------------------
                Pause Video
            ----------------------------------------------
            */

            const video =
                miniTheatreView.getVideo();


            if (!video) {

                return;

            }


            try {

                video.pause();

            } catch (error) {

                console.warn(
                    "Mini Theatre: Failed to pause video.",
                    error
                );

            }

        }
        /*==============================================
            Skip Playback
        ==============================================*/

    skip(seconds = 0) {

        const video =
            miniTheatreView.getVideo();

        if (!video) {
            return;
        }


        if (!Number.isFinite(seconds)) {
            return;
        }


        if (!Number.isFinite(video.duration) ||
            video.duration <= 0
        ) {
            return;
        }


        const targetTime =
            video.currentTime + seconds;


        video.currentTime =
            Math.max(
                0,
                Math.min(
                    video.duration,
                    targetTime
                )
            );

    }

    /*==================================================
        Handle Playback Ended
    ==================================================*/

    handlePlaybackEnded() {

        /*
        ----------------------------------------------
            Temporary Trailer
        ----------------------------------------------
        */

        if (this.temporaryTrailer) {

            this.restorePreviousTheatre();

            return;

        }


        if (!this.state.movie) {

            return;

        }


        /*
        ----------------------------------------------
            Stop Progress Saving
        ----------------------------------------------
        */

        watchProgressController.stopAutoSave();


        /*
        ----------------------------------------------
            Save Final Progress
        ----------------------------------------------
        */

        try {

            watchProgressController.save();

        } catch (error) {

            console.warn(
                "Mini Theatre: Failed to save final progress.",
                error
            );

        }


        /*
        ----------------------------------------------
            Completion State
        ----------------------------------------------
        */

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            true;

        this.state.progress =
            100;


        /*
        ----------------------------------------------
            Mark Playlist Movie Complete
        ----------------------------------------------
        */

        const result =
            playlistController.complete(
                this.state.index
            );


        /*
        ----------------------------------------------
            Synchronize Card
        ----------------------------------------------
        */

        this.syncActiveCard();


        if (result) {

            console.log(
                "Mini Theatre: Movie completed.",
                result.movie &&
                result.movie.title
            );

        }

    }


    /*==================================================
        Capture Current Playback
    ==================================================*/

    captureCurrentPlayback() {

        if (!this.state.movie) {

            return null;

        }


        const video =
            miniTheatreView.getVideo();


        let currentTime = 0;

        let duration = 0;

        let progress =
            this.state.progress;


        if (video) {

            currentTime =
                Number.isFinite(video.currentTime) ?
                video.currentTime :
                0;


            duration =
                Number.isFinite(video.duration) ?
                video.duration :
                0;


            if (duration > 0) {

                progress =
                    (
                        currentTime /
                        duration
                    ) * 100;

            }

        }


        return {

            movie: this.state.movie,

            index: this.state.index,

            currentTime,

            duration,

            progress: Math.max(
                0,
                Math.min(
                    100,
                    Number.isFinite(progress) ?
                    progress :
                    0
                )
            ),

            wasPlaying: this.state.isPlaying,

            wasPaused: this.state.isPaused,

            wasCompleted: this.state.isCompleted

        };

    }


    /*==================================================
        Restore Captured State
    ==================================================*/

    restoreCapturedState(snapshot) {

        if (!snapshot) {

            return;

        }


        this.state.movie =
            snapshot.movie;

        this.state.index =
            snapshot.index;

        this.state.isPlaying =
            snapshot.wasPlaying;

        this.state.isPaused =
            snapshot.wasPaused;

        this.state.isCompleted =
            snapshot.wasCompleted;

        this.state.progress =
            snapshot.progress;

    }


    /*==================================================
        Update Previous Card
    ==================================================*/

    updatePreviousCard(previous) {

        if (!previous) {

            return;

        }


        /*
        ----------------------------------------------
            Completed
        ----------------------------------------------
        */

        if (previous.wasCompleted) {

            miniTheatreView.updateCardState(
                previous.index, {

                    status: "🔵 COMPLETE",

                    progress: 100,

                    completed: true,

                    playing: false,

                    paused: false,

                    resume: false,

                    play: false,

                    pause: false

                }
            );

            return;

        }


        /*
        ----------------------------------------------
            Playing / Paused
        ----------------------------------------------
        */

        if (
            previous.wasPlaying ||
            previous.wasPaused
        ) {

            miniTheatreView.updateCardState(
                previous.index, {

                    status: "🟡 PAUSED",

                    progress: previous.progress,

                    completed: false,

                    playing: false,

                    paused: true,

                    resume: true,

                    play: false,

                    pause: false

                }
            );

            return;

        }


        /*
        ----------------------------------------------
            Ready
        ----------------------------------------------
        */

        miniTheatreView.updateCardState(
            previous.index, {

                status: "⚪ READY",

                progress: previous.progress,

                completed: false,

                playing: false,

                paused: false,

                resume: false,

                play: true,

                pause: false

            }
        );

    }


    /*==================================================
        Synchronize Active Playlist Card
    ==================================================*/

    syncActiveCard() {

        const index =
            this.state.index;


        if (!Number.isInteger(index) ||
            index < 0
        ) {

            return;

        }


        /*
        ----------------------------------------------
            Completed
        ----------------------------------------------
        */

        const completed =
            this.state.isCompleted ||
            (
                this.state.movie &&
                playlistController.isCompleted(
                    this.state.movie
                )
            );


        if (completed) {

            miniTheatreView.updateCardState(
                index, {

                    status: "🔵 COMPLETE",

                    progress: 100,

                    completed: true,

                    playing: false,

                    paused: false,

                    resume: false,

                    play: false,

                    pause: false

                }
            );

            return;

        }


        /*
        ----------------------------------------------
            Playing
        ----------------------------------------------
        */

        if (this.state.isPlaying) {

            miniTheatreView.updateCardState(
                index, {

                    status: "🔴 PLAYING",

                    progress: this.state.progress,

                    completed: false,

                    playing: true,

                    paused: false,

                    resume: false,

                    play: false,

                    pause: true

                }
            );

            return;

        }


        /*
        ----------------------------------------------
            Paused
        ----------------------------------------------
        */

        if (this.state.isPaused) {

            miniTheatreView.updateCardState(
                index, {

                    status: "🟡 PAUSED",

                    progress: this.state.progress,

                    completed: false,

                    playing: false,

                    paused: true,

                    resume: true,

                    play: false,

                    pause: false

                }
            );

            return;

        }


        /*
        ----------------------------------------------
            Ready
        ----------------------------------------------
        */

        miniTheatreView.updateCardState(
            index, {

                status: "⚪ READY",

                progress: this.state.progress,

                completed: false,

                playing: false,

                paused: false,

                resume: false,

                play: true,

                pause: false

            }
        );

    }


    /*==================================================
        Update Progress
    ==================================================*/

    updateProgress(progress) {

        if (!Number.isFinite(progress)) {

            return;

        }


        this.state.progress =
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            );


        if (
            this.state.progress >= 100
        ) {

            this.state.progress = 100;

        }


        this.syncActiveCard();

    }


    /*==================================================
        Update State Progress
    ==================================================*/

    updateStateProgress() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        const currentTime =
            Number(video.currentTime);


        const duration =
            Number(video.duration);


        if (
            Number.isFinite(currentTime) &&
            Number.isFinite(duration) &&
            duration > 0
        ) {

            this.updateProgress(
                (
                    currentTime /
                    duration
                ) * 100
            );

        }

    }


    /*==================================================
        Has Resume Progress
    ==================================================*/

    hasResumeProgress() {

        return (
            this.state.progress > 0 &&
            this.state.progress < 95
        );

    }


    /*==================================================
        Play Temporary Trailer
    ==================================================*/

    async playTrailer(trailer) {

        if (!trailer) {

            return false;

        }


        /*
        ----------------------------------------------
            Prevent Nested Trailers
        ----------------------------------------------
        */

        if (this.temporaryTrailer) {

            return false;

        }


        /*
        ----------------------------------------------
            Capture Existing Theatre
        ----------------------------------------------
        */

        const previous =
            this.captureCurrentPlayback();


        /*
        ----------------------------------------------
            Stop Existing Playback
        ----------------------------------------------
        */

        this.stopCurrentPlayback();


        /*
        ----------------------------------------------
            Resolve Trailer Source
        ----------------------------------------------
        */

        const trailerSource =
            this.resolveTrailerSource(trailer);


        if (!trailerSource) {

            return false;

        }


        /*
        ----------------------------------------------
            Save Temporary State
        ----------------------------------------------
        */

        this.temporaryTrailer = {

            previous,

            trailer

        };


        /*
        ----------------------------------------------
            Create Temporary Movie
        ----------------------------------------------
        */

        const temporaryMovie =
            this.createTemporaryTrailerMovie(
                trailer
            );


        miniTheatreView.renderMovie(
            temporaryMovie
        );


        miniTheatreView.bindEnded(
            () => this.handlePlaybackEnded()
        );


        /*
        ----------------------------------------------
            Get Video
        ----------------------------------------------
        */

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            this.temporaryTrailer = null;

            return false;

        }


        /*
        ----------------------------------------------
            Replace Source
        ----------------------------------------------
        */

        try {

            video.pause();

            video.removeAttribute("src");

            video.load();

            video.src =
                trailerSource;

            video.load();

        } catch (error) {

            console.error(
                "Mini Theatre: Failed to load trailer.",
                error
            );

            this.temporaryTrailer = null;

            this.restorePreviousTheatre();

            return false;

        }


        /*
        ----------------------------------------------
            Clear Persistent Playback State
        ----------------------------------------------
        */

        this.state.movie =
            null;

        this.state.index = -1;

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            false;

        this.state.progress =
            0;


        /*
        ----------------------------------------------
            Play Trailer
        ----------------------------------------------
        */

        try {

            const started =
                await miniTheatreView.playVideo();


            if (!started) {

                await this.restorePreviousTheatre();

                return false;

            }


            return true;

        } catch (error) {

            console.error(
                "Mini Theatre: Trailer playback failed.",
                error
            );

            await this.restorePreviousTheatre();

            return false;

        }

    }


    /*==================================================
        Resolve Trailer Source
    ==================================================*/

    resolveTrailerSource(trailer) {

        if (
            typeof trailer === "string"
        ) {

            return trailer;

        }


        if (
            typeof trailer !== "object" ||
            trailer === null
        ) {

            return null;

        }


        return (
            trailer.trailer ||
            trailer.trailerUrl ||
            trailer.url ||
            trailer.src ||
            trailer.video ||
            null
        );

    }


    /*==================================================
        Create Temporary Trailer Movie
    ==================================================*/

    createTemporaryTrailerMovie(trailer) {

        if (
            typeof trailer === "object" &&
            trailer !== null
        ) {

            return {

                ...trailer,

                title: trailer.title ||
                    "Trailer",

                description: trailer.description ||
                    "Trailer"

            };

        }


        return {

            id: "temporary-trailer",

            slug: "temporary-trailer",

            title: "Trailer",

            description: "Trailer",

            poster: "",

            year: "",

            duration: "",

            rating: "",

            quality: ""

        };

    }


    /*==================================================
        Restore Previous Theatre
    ==================================================*/

    async restorePreviousTheatre() {

        const temporary =
            this.temporaryTrailer;


        if (!temporary) {

            return;

        }


        /*
        ----------------------------------------------
            Clear Temporary State First
        ----------------------------------------------
        */

        this.temporaryTrailer =
            null;


        const previous =
            temporary.previous;


        /*
        ----------------------------------------------
            No Previous Movie
        ----------------------------------------------
        */

        if (!previous) {

            this.resetState();

            miniTheatreView.renderEmpty();

            return;

        }


        /*
        ----------------------------------------------
            Restore State
        ----------------------------------------------
        */

        this.state.movie =
            previous.movie;

        this.state.index =
            previous.index;

        this.state.isCompleted =
            previous.wasCompleted;

        this.state.isPlaying =
            false;

        this.state.isPaused =
            previous.wasPaused;

        this.state.progress =
            previous.progress;


        /*
        ----------------------------------------------
            Render Previous Movie
        ----------------------------------------------
        */

        this.renderCurrentMovie();


        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        /*
        ----------------------------------------------
            Restore Exact Position
        ----------------------------------------------
        */

        const restorePosition =
            () => {

                if (!Number.isFinite(
                        previous.currentTime
                    )) {

                    return;

                }


                if (!Number.isFinite(
                        video.duration
                    ) ||
                    video.duration <= 0
                ) {

                    return;

                }


                video.currentTime =
                    Math.max(
                        0,
                        Math.min(
                            video.duration,
                            previous.currentTime
                        )
                    );

            };


        if (
            video.readyState >= 1
        ) {

            restorePosition();

        } else {

            video.addEventListener(
                "loadedmetadata",
                restorePosition, {
                    once: true
                }
            );

        }


        /*
        ----------------------------------------------
            Restore Completed
        ----------------------------------------------
        */

        if (previous.wasCompleted) {

            this.state.isCompleted =
                true;

            this.state.isPlaying =
                false;

            this.state.isPaused =
                false;

            this.state.progress =
                100;

            this.syncActiveCard();

            return;

        }


        /*
        ----------------------------------------------
            Restore Paused
        ----------------------------------------------
        */

        if (previous.wasPaused) {

            this.state.isPlaying =
                false;

            this.state.isPaused =
                true;

            this.syncActiveCard();

            return;

        }


        /*
        ----------------------------------------------
            Restore Playing
        ----------------------------------------------
        */

        if (previous.wasPlaying) {

            try {

                const started =
                    await miniTheatreView.playVideo();


                if (started) {

                    this.state.isPlaying =
                        true;

                    this.state.isPaused =
                        false;

                    this.state.isCompleted =
                        false;


                    watchProgressController.startAutoSave();

                }

            } catch (error) {

                console.error(
                    "Mini Theatre: Failed to restore previous playback.",
                    error
                );

            }


            this.syncActiveCard();

            return;

        }


        /*
        ----------------------------------------------
            Restore Ready
        ----------------------------------------------
        */

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;


        this.syncActiveCard();

    }


    /*==================================================
        Remove Current Movie
    ==================================================*/

    removeCurrentMovie() {

        const movie =
            this.state.movie;


        if (!movie) {

            return null;

        }


        const currentIndex =
            this.state.index;


        /*
        ----------------------------------------------
            Stop Playback
        ----------------------------------------------
        */

        this.stopCurrentPlayback();


        /*
        ----------------------------------------------
            Remove Movie
        ----------------------------------------------
        */

        const removed =
            playlistController.remove(movie);


        if (!removed) {

            return null;

        }


        /*
        ----------------------------------------------
            Get Updated Playlist
        ----------------------------------------------
        */

        const movies =
            playlistController.getAll();


        /*
        ----------------------------------------------
            Playlist Empty
        ----------------------------------------------
        */

        if (!movies.length) {

            this.resetState();

            miniTheatreView.renderPlaylist([]);

            miniTheatreView.renderEmpty();

            return removed;

        }


        /*
        ----------------------------------------------
            Resolve Next Index
        ----------------------------------------------
        */

        let nextIndex =
            playlistController.getCurrentIndex();


        if (!Number.isInteger(nextIndex) ||
            nextIndex < 0 ||
            nextIndex >= movies.length
        ) {

            nextIndex =
                Math.min(
                    currentIndex,
                    movies.length - 1
                );

        }


        /*
        ----------------------------------------------
            Activate Next Movie
        ----------------------------------------------
        */

        const nextMovie =
            playlistController.setCurrent(
                nextIndex
            );


        if (!nextMovie) {

            this.resetState();

            miniTheatreView.renderEmpty();

            return removed;

        }


        /*
        ----------------------------------------------
            Update State
        ----------------------------------------------
        */

        this.state.movie =
            nextMovie;

        this.state.index =
            nextIndex;

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            playlistController.isCompleted(
                nextMovie
            );

        this.state.progress =
            this.state.isCompleted ?
            100 :
            0;


        /*
        ----------------------------------------------
            Render Next Movie
        ----------------------------------------------
        */

        this.renderCurrentMovie();


        return removed;

    }


    /*==================================================
        Reset State
    ==================================================*/

    resetState() {

        this.state.movie =
            null;

        this.state.index = -1;

        this.state.isPlaying =
            false;

        this.state.isPaused =
            false;

        this.state.isCompleted =
            false;

        this.state.progress =
            0;

    }


    /*==================================================
        Clear
    ==================================================*/

    clear() {

        this.stopCurrentPlayback();

        this.resetState();

        this.temporaryTrailer =
            null;

        this.playbackRequest++;


        miniTheatreView.clear();

    }

}


/*==================================================
    Export Singleton
==================================================*/

export const miniTheatrePlaybackController =
    new MiniTheatrePlaybackController();