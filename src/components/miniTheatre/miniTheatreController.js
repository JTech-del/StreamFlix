"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Controller V4

    Responsibility

    ✓ Coordinate Mini Theatre
    ✓ Coordinate Media Rail
    ✓ Coordinate Playlist
    ✓ Coordinate Playback Controller
    ✓ Coordinate Watch Progress
    ✓ Synchronize View
    ✓ No Playback Business Logic
    ✓ No Direct Video Manipulation
==================================================*/

import { miniTheatreView }
from "./miniTheatreView.js";

import { miniTheatrePlaybackController }
from "./controllers/miniTheatrePlaybackController.js";

import { miniTheatreUIController }
from "./controllers/miniTheatreUIController.js";

import { playlistController }
from "./playlist/playlistController.js";

import { mediaRailEvents }
from "../mediaRail/mediaRailEvents.js";

import { MediaRailEventTypes }
from "../mediaRail/mediaRailEventTypes.js";

import { playlistEvents }
from "./playlist/playlistEvents.js";

import { PlaylistEventTypes }
from "./playlist/playlistEventTypes.js";

import { watchProgressEvents }
from "./watchProgress/watchProgressEvents.js";

import { WatchProgressEventTypes }
from "./watchProgress/watchProgressEventTypes.js";


class MiniTheatreController {


    /*==============================================
        Constructor
    ==============================================*/

    constructor() {

        /*
        --------------------------------------------
            Application State
        --------------------------------------------
        */

        this.state = {

            movie: null,

            index: -1,

            progress: 0

        };


        /*
        --------------------------------------------
            Initialization Guard
        --------------------------------------------
        */

        this.initialized = false;


        /*
        --------------------------------------------
            Global Event Binding Guards
        --------------------------------------------
        */

        this.eventsBound = false;

        this.keyboardBound = false;

        this.fullscreenBound = false;

        this.watchProgressBound = false;

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (this.initialized) {

            return;

        }


        if (!container) {

            console.warn(
                "Mini Theatre Controller: Container not found."
            );

            return;

        }


        /*
        --------------------------------------------
            Initialize View
        --------------------------------------------
        */

        miniTheatreView.init(
            container
        );


        /*
        --------------------------------------------
            Initialize Playlist
        --------------------------------------------
        */

        playlistController.init();


        /*
        --------------------------------------------
            Render Persistent Playlist
        --------------------------------------------
        */

        this.renderPlaylist();


        /*
        --------------------------------------------
            Restore Current Movie
        --------------------------------------------
        */

        this.restoreCurrentMovie();


        /*
        --------------------------------------------
            Bind Application Events
        --------------------------------------------
        */

        this.bindEvents();


        /*
        --------------------------------------------
            Bind Playlist Actions
        --------------------------------------------
        */

        this.bindPlaylistActions();


        /*
        --------------------------------------------
            Bind Global UI Events
        --------------------------------------------
        */

        this.bindFullscreenEvents();

        this.bindKeyboardShortcuts();

        this.bindWatchProgressEvents();


        this.initialized = true;

    }


    /*==============================================
        Render Playlist
    ==============================================*/

    renderPlaylist() {

        const movies =
            playlistController.getAll();


        miniTheatreView.renderPlaylist(
            movies
        );


        miniTheatreView.updateCounter(
            movies.length
        );

    }


    /*==============================================
        Restore Current Movie
    ==============================================*/

    restoreCurrentMovie() {

        const movie =
            playlistController.getCurrent();


        if (!movie) {

            this.resetState();

            miniTheatreView.renderEmpty();

            return;

        }


        const index =
            playlistController.getCurrentIndex();


        this.state.movie =
            movie;


        this.state.index =
            index;


        this.renderCurrentMovie();

    }


    /*==============================================
        Render Current Movie
    ==============================================*/

    renderCurrentMovie() {

        const movie =
            this.state.movie;


        if (!movie) {

            miniTheatreView.renderEmpty();

            return;

        }


        /*
        --------------------------------------------
            Render Movie
        --------------------------------------------
        */

        miniTheatreView.renderMovie(
            movie
        );


        /*
        --------------------------------------------
            Highlight Active Playlist Card
        --------------------------------------------
        */

        this.syncActivePlaylist();


        /*
        --------------------------------------------
            Prepare Watch Progress
        --------------------------------------------
        */

        this.prepareWatchProgress();


        /*
        --------------------------------------------
            Rebind DOM Controls
        --------------------------------------------
        */

        this.bindTheatreControls();


        /*
        --------------------------------------------
            Synchronize Playback UI
        --------------------------------------------
        */

        this.syncPlaybackUI();

    }


    /*==============================================
        Prepare Watch Progress
    ==============================================*/

    prepareWatchProgress() {

        const video =
            miniTheatreView.getVideo();


        if (!video ||
            !this.state.movie
        ) {

            return;

        }


        /*
        --------------------------------------------
            Playback Controller owns playback state.
            Watch Progress Controller owns persistence.

            The Controller only synchronizes the
            progress already maintained by the
            Playback Controller.
        --------------------------------------------
        */

        const playbackState =
            miniTheatrePlaybackController.state;


        if (!playbackState) {

            this.state.progress = 0;

            return;

        }


        const progress =
            playbackState.progress;


        this.state.progress =
            Number.isFinite(progress) ?
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            ) :
            0;


        /*
        --------------------------------------------
            Resume Prompt
        --------------------------------------------
        */

        if (
            this.state.progress > 0 &&
            this.state.progress < 95
        ) {

            miniTheatreView.showResumePrompt(
                this.state.progress
            );

        }

    }


    /*==============================================
        Bind Application Events
    ==============================================*/

    bindEvents() {

        if (this.eventsBound) {

            return;

        }


        this.eventsBound = true;


        /*
        --------------------------------------------
            Media Rail
        --------------------------------------------
        */

        mediaRailEvents.on(
            MediaRailEventTypes.MOVIE_SELECTED,
            ({ movie }) => {

                this.handleMovieSelected(
                    movie
                );

            }
        );


        /*
        --------------------------------------------
            Playlist Current Changed
        --------------------------------------------
        */

        playlistEvents.on(
            PlaylistEventTypes.CURRENT_CHANGED,
            ({ movie, index }) => {

                if (!movie) {

                    this.resetState();

                    miniTheatreView.renderEmpty();

                    return;

                }


                this.state.movie =
                    movie;


                this.state.index =
                    index;


                this.renderCurrentMovie();

            }
        );


        /*
        --------------------------------------------
            Playlist Updated
        --------------------------------------------
        */

        playlistEvents.on(
            PlaylistEventTypes.UPDATED,
            ({ movies = [] }) => {

                miniTheatreView.renderPlaylist(
                    movies
                );


                miniTheatreView.updateCounter(
                    movies.length
                );


                this.syncActivePlaylist();

            }
        );

    }


    /*==============================================
        Handle Movie Selected
    ==============================================*/

    async handleMovieSelected(movie) {

        if (!movie) {

            return;

        }


        await miniTheatrePlaybackController
            .handleMovieSelected(
                movie
            );


        this.syncStateFromPlayback();

    }


    /*==============================================
        Sync State From Playback
    ==============================================*/

    syncStateFromPlayback() {

        const playbackState =
            miniTheatrePlaybackController.state;


        if (!playbackState) {

            return;

        }


        if (playbackState.movie) {

            this.state.movie =
                playbackState.movie;

        }


        this.state.index =
            Number.isInteger(
                playbackState.index
            ) ?
            playbackState.index :
            this.state.index;


        this.state.progress =
            Number.isFinite(
                playbackState.progress
            ) ?
            playbackState.progress :
            0;

    }


    /*==============================================
        Bind Playlist Actions
    ==============================================*/

    bindPlaylistActions() {

        miniTheatreView.bindPlaylistActions(
            ({ index, action }) => {

                this.handlePlaylistAction({
                    index,
                    action
                });

            }
        );

    }


    /*==============================================
        Handle Playlist Action
    ==============================================*/

    async handlePlaylistAction({
        index,
        action
    }) {

        const movies =
            playlistController.getAll();


        const movie =
            movies[index];


        if (!movie) {

            return;

        }


        switch (action) {


            /*--------------------------------------
                Play
            --------------------------------------*/

            case "play":

                await miniTheatrePlaybackController
                    .handleMovieSelected(
                        movie
                    );

                this.syncStateFromPlayback();

                break;


                /*--------------------------------------
                    Pause
                --------------------------------------*/

            case "pause":

                if (
                    miniTheatrePlaybackController
                    .state
                    .index === index
                ) {

                    miniTheatrePlaybackController
                        .pausePlayback();

                    this.syncStateFromPlayback();

                }

                break;


                /*--------------------------------------
                    Resume
                --------------------------------------*/

            case "resume":

                if (
                    miniTheatrePlaybackController
                    .state
                    .index !== index
                ) {

                    await miniTheatrePlaybackController
                        .handleMovieSelected(
                            movie
                        );

                } else {

                    await miniTheatrePlaybackController
                        .resumePlayback();

                }


                this.syncStateFromPlayback();

                break;


                /*--------------------------------------
                    Remove
                --------------------------------------*/

            case "remove":

                if (
                    miniTheatrePlaybackController
                    .state
                    .index === index
                ) {

                    miniTheatrePlaybackController
                        .removeCurrentMovie();

                }

                break;


            default:

                console.warn(
                    "Mini Theatre: Unknown playlist action.",
                    action
                );

        }

    }


    /*==============================================
        Bind Theatre Controls
    ==============================================*/

    bindTheatreControls() {

        /*
        --------------------------------------------
            Primary Play
        --------------------------------------------
        */

        miniTheatreView.bindPlay(
            () =>
            miniTheatrePlaybackController
            .startPlayback()
        );


        /*
        --------------------------------------------
            Resume
        --------------------------------------------
        */

        miniTheatreView.bindResume(
            () =>
            miniTheatrePlaybackController
            .resumePlayback()
        );


        /*
        --------------------------------------------
            Remove
        --------------------------------------------
        */

        miniTheatreView.bindRemove(
            () =>
            miniTheatrePlaybackController
            .removeCurrentMovie()
        );


        /*
        --------------------------------------------
            Picture in Picture
        --------------------------------------------
        */

        miniTheatreView.bindPictureInPicture(
            () =>
            miniTheatreUIController
            .togglePictureInPicture()
        );


        /*
        --------------------------------------------
            Cinematic Playback
        --------------------------------------------
        */

        miniTheatreView
            .bindCinematicPlaybackControls({

                onPlay: () => {

                    miniTheatrePlaybackController
                        .startPlayback();

                },

                onPause: () => {

                    miniTheatrePlaybackController
                        .pausePlayback();

                }

            });


        /*
        --------------------------------------------
            Double Click Fullscreen
        --------------------------------------------
        */

        const screen =
            miniTheatreView.getScreen();


        if (screen) {

            screen.ondblclick =
                () => {

                    miniTheatreUIController
                        .toggleFullscreen();

                };

        }


        /*==========================================
            Cinematic Skip Controls
        ==========================================*/

        miniTheatreView.bindCinematicSkip({

            onBackward: () => {

                miniTheatrePlaybackController
                    .skip(-10);

            },


            onForward: () => {

                miniTheatrePlaybackController
                    .skip(10);

            }

        });


        /*==========================================
            Cinematic Volume
        ==========================================*/

        miniTheatreView.bindCinematicVolume({

            onToggleMute: () => {

                miniTheatreUIController
                    .toggleMute();

            },


            onVolumeChange: (volume) => {

                miniTheatreUIController
                    .setVolume(volume);

            }

        });


        /*==========================================
            Cinematic Picture in Picture
        ==========================================*/

        miniTheatreView.bindCinematicPictureInPicture(
            () => {

                miniTheatreUIController
                    .togglePictureInPicture();

            }
        );


        /*==========================================
            Cinematic Fullscreen
        ==========================================*/

        miniTheatreView.bindCinematicFullscreen(
            () => {

                miniTheatreUIController
                    .toggleFullscreen();

            }
        );

    }


    /*==============================================
        Sync Playback UI
    ==============================================*/

    syncPlaybackUI() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        /*
        --------------------------------------------
            The video element is the runtime source
            for the actual cinematic control state.
        --------------------------------------------
        */

        if (video.ended) {

            miniTheatreView
                .updatePlaybackControls(
                    "completed"
                );

            return;

        }


        if (!video.paused) {

            miniTheatreView
                .updatePlaybackControls(
                    "playing"
                );

            return;

        }


        miniTheatreView
            .updatePlaybackControls(
                "paused"
            );

    }


    /*==============================================
        Sync Active Playlist
    ==============================================*/

    syncActivePlaylist() {

        const index =
            this.state.index;


        if (!Number.isInteger(index) ||
            index < 0
        ) {

            return;

        }


        miniTheatreView.setActive(
            index
        );


        miniTheatreView.scrollToActive(
            index
        );

    }


    /*==============================================
        Bind Watch Progress Events
    ==============================================*/

    bindWatchProgressEvents() {

        if (this.watchProgressBound) {

            return;

        }


        this.watchProgressBound = true;


        /*
        --------------------------------------------
            Progress Updated
        --------------------------------------------
        */

        watchProgressEvents.on(
            WatchProgressEventTypes.UPDATED,
            ({ progress }) => {

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


                /*
                Playback Controller remains the
                owner of playlist playback state.
                */

                miniTheatrePlaybackController
                    .updateProgress(
                        this.state.progress
                    );

            }
        );


        /*
        --------------------------------------------
            Progress Restored
        --------------------------------------------
        */

        watchProgressEvents.on(
            WatchProgressEventTypes.RESTORED,
            ({ progress }) => {

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


                miniTheatrePlaybackController
                    .updateProgress(
                        this.state.progress
                    );

            }
        );


        /*
        --------------------------------------------
            Progress Saved
        --------------------------------------------
        */

        watchProgressEvents.on(
            WatchProgressEventTypes.SAVED,
            ({ currentTime }) => {

                const video =
                    miniTheatreView.getVideo();


                if (!video ||
                    !Number.isFinite(
                        currentTime
                    ) ||
                    !Number.isFinite(
                        video.duration
                    ) ||
                    video.duration <= 0
                ) {

                    return;

                }


                this.state.progress =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            (
                                currentTime /
                                video.duration
                            ) * 100
                        )
                    );


                miniTheatrePlaybackController
                    .updateProgress(
                        this.state.progress
                    );

            }
        );

    }


    /*==============================================
        Bind Fullscreen Events
    ==============================================*/

    bindFullscreenEvents() {

        if (this.fullscreenBound) {

            return;

        }


        this.fullscreenBound = true;


        document.addEventListener(
            "fullscreenchange",
            () => {

                const active =
                    Boolean(
                        document.fullscreenElement
                    );


                const screen =
                    miniTheatreView.getScreen();


                /*
                ------------------------------------
                    Synchronize fullscreen state
                ------------------------------------
                */

                miniTheatreView
                    .setFullscreenState(
                        active
                    );


                /*
                ------------------------------------
                    Keep fullscreen state on screen
                    for CSS/UI coordination.
                ------------------------------------
                */

                if (screen) {

                    screen.classList.toggle(
                        "is-fullscreen",
                        active
                    );

                }


                /*
                ------------------------------------
                    Movie information must not remain
                    visible while fullscreen is active.
                ------------------------------------
                */

                if (active) {

                    miniTheatreView
                        .hideOverlay();

                }

            }
        );

    }


    /*==============================================
        Bind Keyboard Shortcuts
    ==============================================*/

    bindKeyboardShortcuts() {

        if (this.keyboardBound) {

            return;

        }


        this.keyboardBound = true;


        document.addEventListener(
            "keydown",
            (event) => {

                const target =
                    event.target;


                /*
                ------------------------------------
                    Ignore typing fields
                ------------------------------------
                */

                if (
                    target instanceof HTMLElement &&
                    (
                        target.matches(
                            "input, textarea, select"
                        ) ||
                        target.isContentEditable
                    )
                ) {

                    return;

                }


                switch (
                    event.key.toLowerCase()
                ) {


                    case "f":

                        event.preventDefault();

                        miniTheatreUIController
                            .toggleFullscreen();

                        break;


                    default:

                        break;

                }

            }
        );

    }


    /*==============================================
        Public Play
    ==============================================*/

    async play(movie) {

        if (!movie) {

            return;

        }


        await this.handleMovieSelected(
            movie
        );

    }


    /*==============================================
        Public Trailer
    ==============================================*/

    async playTrailer(trailer) {

        if (!trailer) {

            return;

        }


        /*
        Trailer playback is delegated entirely
        to the Playback Controller.

        It must not become a playlist item.
        */

        if (
            typeof miniTheatrePlaybackController
            .playTrailer ===
            "function"
        ) {

            await miniTheatrePlaybackController
                .playTrailer(
                    trailer
                );

        }

    }


    /*==============================================
        Clear
    ==============================================*/

    clear() {

        /*
        --------------------------------------------
            Do not call controller-level playback
            orchestration here.

            The View owns DOM cleanup and the
            Playback Controller owns playback.
        --------------------------------------------
        */

        const video =
            miniTheatreView.getVideo();


        if (video) {

            video.pause();

        }


        playlistController.clear();


        this.resetState();


        miniTheatreView.clear();

    }


    /*==============================================
        Reset State
    ==============================================*/

    resetState() {

        this.state.movie =
            null;


        this.state.index = -1;


        this.state.progress =
            0;

    }

}


/*==================================================
    Export Singleton
==================================================*/

export const miniTheatreController =
    new MiniTheatreController();