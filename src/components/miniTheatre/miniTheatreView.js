"use strict";

/*==================================================
    StreamFlix

    Mini Theatre View V5

    Responsibility

    ✓ Render Mini Theatre UI
    ✓ Cache DOM elements
    ✓ Manage Theatre UI State
    ✓ Manage Playback UI
    ✓ Manage Settings UI
    ✓ Manage Playlist UI
    ✓ Manage Media UI lifecycle
    ✓ Maintain persistent handlers
    ✓ Rebind recreated movie controls
    ✓ No Business Logic
==================================================*/

import { miniTheatreTemplates }
from "./miniTheatreTemplates.js";


class MiniTheatreView {

    /*==============================================
        Constructor
    ==============================================*/

    constructor() {

        this.elements = {

            /*------------------------------------------
                Root / Layout
            ------------------------------------------*/

            container: null,

            theatre: null,

            screen: null,

            sidebar: null,

            playlist: null,

            counter: null,

            /*------------------------------------------
                Theatre
            ------------------------------------------*/

            media: null,

            content: null,

            overlay: null,

            metadata: null,

            controls: null,

            placeholder: null,

            poster: null,

            video: null,

            title: null,

            overview: null,

            playButton: null,

            resumeButton: null,

            removeButton: null,

            pictureInPicture: null,

            /*------------------------------------------
                Cinematic Controls
            ------------------------------------------*/

            cinematicControls: null,

            cinematicPlay: null,

            cinematicPause: null,

            cinematicVolume: null,

            cinematicVolumeSlider: null,

            currentTime: null,

            duration: null,

            cinematicProgress: null,

            cinematicProgressFill: null,

            cinematicProgressBuffer: null,

            cinematicProgressPreview: null,

            cinematicProgressPlayhead: null,

            cinematicPip: null,

            cinematicFullscreen: null,

            cinematicSkipBackward: null,

            cinematicSkipForward: null,

            /*------------------------------------------
                Settings
            ------------------------------------------*/

            cinematicSettings: null,

            cinematicSettingsMenu: null,

            cinematicSettingsClose: null,

            cinematicSpeedOptions: null,

            cinematicQuality: null,

            qualityOptions: null,

            settings: null,

            settingsButton: null,

            settingsMenu: null,

            settingsMain: null,

            settingsClose: null,

            settingsBackButtons: null,

            settingsItems: null,

            settingsSubmenus: null,

            settingsOptions: null,

            settingsSpeedOptions: null,

            settingsQualityOptions: null

        };


        /*------------------------------------------
            Current UI State

            empty
            selected
            playing
            paused
            completed
        ------------------------------------------*/

        this.state =
            "empty";


        /*------------------------------------------
            Persistent Handlers

            These survive renderMovie() because
            movie DOM is recreated.
        ------------------------------------------*/

        this.handlers = {

            onPlay: null,

            onPause: null,

            onResume: null,

            onRemove: null,

            onEnded: null,

            onToggleMute: null,

            onVolumeChange: null,

            onPictureInPicture: null,

            onFullscreen: null,

            onSkipBackward: null,

            onSkipForward: null,

            onSpeedChange: null,

            onQualityChange: null,

            onPlaylistAction: null

        };


        /*------------------------------------------
            Global Listener State
        ------------------------------------------*/

        this.settingsOutsideClickBound =
            false;

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (!container) {

            return;

        }


        this.elements.container =
            container;


        /*
        Render permanent layout.
        */

        container.innerHTML =
            miniTheatreTemplates.layout();


        /*
        Cache permanent DOM.
        */

        this.cacheLayout();

    }


    /*==============================================
        Cache Layout
    ==============================================*/

    cacheLayout() {

        const container =
            this.elements.container;


        if (!container) {

            return;

        }


        this.elements.theatre =
            container.querySelector(
                ".mini-theatre"
            );


        this.elements.screen =
            container.querySelector(
                ".mini-theatre__screen"
            );


        this.elements.sidebar =
            container.querySelector(
                ".mini-theatre__sidebar"
            );


        this.elements.playlist =
            container.querySelector(
                ".mini-theatre__playlist"
            );


        this.elements.counter =
            container.querySelector(
                ".mini-theatre__counter"
            );

    }


    /*==============================================
        Cache Theatre
    ==============================================*/

    cacheTheatre() {

        const screen =
            this.elements.screen;


        if (!screen) {

            return;

        }


        /*------------------------------------------
            Media
        ------------------------------------------*/

        this.elements.media =
            screen.querySelector(
                ".mini-theatre__media"
            );


        this.elements.poster =
            screen.querySelector(
                ".mini-theatre__poster"
            );


        this.elements.video =
            screen.querySelector(
                ".mini-theatre__video"
            );


        /*------------------------------------------
            Content
        ------------------------------------------*/

        this.elements.content =
            screen.querySelector(
                ".mini-theatre__content"
            );


        this.elements.overlay =
            screen.querySelector(
                ".mini-theatre__overlay"
            ) ||
            this.elements.content;


        this.elements.title =
            screen.querySelector(
                ".mini-theatre__title"
            );


        this.elements.metadata =
            screen.querySelector(
                ".mini-theatre__metadata"
            );


        this.elements.overview =
            screen.querySelector(
                ".mini-theatre__overview"
            );


        /*------------------------------------------
            Theatre Controls
        ------------------------------------------*/

        this.elements.controls =
            screen.querySelector(
                ".mini-theatre__controls"
            );


        this.elements.placeholder =
            screen.querySelector(
                ".mini-theatre__placeholder"
            );


        this.elements.playButton =
            screen.querySelector(
                ".mini-theatre__play"
            );


        this.elements.resumeButton =
            screen.querySelector(
                ".mini-theatre__resume"
            );


        this.elements.removeButton =
            screen.querySelector(
                ".mini-theatre__remove"
            );


        this.elements.pictureInPicture =
            screen.querySelector(
                ".mini-theatre__action--pip"
            );


        /*------------------------------------------
            Cinematic Controls
        ------------------------------------------*/

        this.elements.cinematicControls =
            screen.querySelector(
                ".mini-theatre__cinematic-controls"
            );


        this.elements.cinematicPlay =
            screen.querySelector(
                ".mini-theatre__control--play"
            );


        this.elements.cinematicPause =
            screen.querySelector(
                ".mini-theatre__control--pause"
            );


        this.elements.cinematicVolume =
            screen.querySelector(
                ".mini-theatre__control--volume"
            );


        this.elements.cinematicVolumeSlider =
            screen.querySelector(
                ".mini-theatre__volume"
            );


        this.elements.currentTime =
            screen.querySelector(
                ".mini-theatre__current-time"
            );


        this.elements.duration =
            screen.querySelector(
                ".mini-theatre__duration"
            );


        /*------------------------------------------
            Progress
        ------------------------------------------*/

        this.elements.cinematicProgress =
            screen.querySelector(
                ".mini-theatre__cinematic-progress"
            );


        this.elements.cinematicProgressFill =
            screen.querySelector(
                ".mini-theatre__cinematic-progress-fill"
            );


        this.elements.cinematicProgressBuffer =
            screen.querySelector(
                ".mini-theatre__cinematic-progress-buffer"
            );


        this.elements.cinematicProgressPreview =
            screen.querySelector(
                ".mini-theatre__progress-preview"
            );


        this.elements.cinematicProgressPlayhead =
            screen.querySelector(
                ".mini-theatre__progress-playhead"
            );


        /*------------------------------------------
            PiP / Fullscreen
        ------------------------------------------*/

        this.elements.cinematicPip =
            screen.querySelector(
                ".mini-theatre__control--pip"
            );


        this.elements.cinematicFullscreen =
            screen.querySelector(
                ".mini-theatre__control--fullscreen"
            );


        /*------------------------------------------
            Skip
        ------------------------------------------*/

        this.elements.cinematicSkipBackward =
            screen.querySelector(
                ".mini-theatre__control--skip-backward"
            );


        this.elements.cinematicSkipForward =
            screen.querySelector(
                ".mini-theatre__control--skip-forward"
            );


        /*------------------------------------------
            Settings
        ------------------------------------------*/

        this.elements.cinematicSettings =
            screen.querySelector(
                ".mini-theatre__control--settings"
            );


        this.elements.cinematicSettingsMenu =
            screen.querySelector(
                ".mini-theatre__settings-menu"
            );


        this.elements.cinematicSettingsClose =
            screen.querySelector(
                ".mini-theatre__settings-close"
            );


        this.elements.cinematicSpeedOptions =
            screen.querySelectorAll(
                ".mini-theatre__settings-option[data-playback-rate]"
            );


        this.elements.cinematicQuality =
            screen.querySelector(
                ".mini-theatre__quality"
            );


        this.elements.qualityOptions =
            screen.querySelectorAll(
                ".mini-theatre__settings-option[data-quality]"
            );


        /*------------------------------------------
            Settings Navigation
        ------------------------------------------*/

        this.elements.settings =
            screen.querySelector(
                ".mini-theatre__settings"
            );


        this.elements.settingsButton =
            this.elements.cinematicSettings;


        this.elements.settingsMenu =
            this.elements.cinematicSettingsMenu;


        this.elements.settingsMain =
            screen.querySelector(
                ".mini-theatre__settings-main"
            );


        this.elements.settingsClose =
            this.elements.cinematicSettingsClose;


        this.elements.settingsBackButtons =
            screen.querySelectorAll(
                "[data-settings-back]"
            );


        this.elements.settingsItems =
            screen.querySelectorAll(
                ".mini-theatre__settings-item"
            );


        this.elements.settingsSubmenus =
            screen.querySelectorAll(
                ".mini-theatre__settings-submenu"
            );


        this.elements.settingsOptions =
            screen.querySelectorAll(
                ".mini-theatre__settings-option"
            );


        this.elements.settingsSpeedOptions =
            screen.querySelectorAll(
                "[data-playback-rate]"
            );


        this.elements.settingsQualityOptions =
            screen.querySelectorAll(
                "[data-quality]"
            );


        this.configureProgressAccessibility();

    }


    /*==============================================
        Configure Progress Accessibility
    ==============================================*/

    configureProgressAccessibility() {

        const progress =
            this.elements.cinematicProgress;


        if (!progress) {

            return;

        }


        progress.setAttribute(
            "role",
            "slider"
        );


        progress.setAttribute(
            "aria-label",
            "Video progress"
        );


        progress.setAttribute(
            "tabindex",
            "0"
        );


        progress.setAttribute(
            "aria-valuemin",
            "0"
        );


        progress.setAttribute(
            "aria-valuemax",
            "100"
        );


        progress.setAttribute(
            "aria-valuenow",
            "0"
        );

    }


    /*==============================================
        Render Movie
    ==============================================*/

    renderMovie(movie) {

        if (!movie) {

            this.renderEmpty();

            return;

        }


        const screen =
            this.elements.screen;


        if (!screen) {

            return;

        }


        /*
        Stop and detach the previous video
        before replacing the theatre DOM.
        */

        this.resetVideo();


        /*
        Render the new movie structure.
        */

        screen.innerHTML =
            miniTheatreTemplates.movie(
                movie
            );


        /*
        Cache the newly-created theatre DOM.
        */

        this.cacheTheatre();


        /*
        Populate static media information.
        */

        this.updatePoster(
            movie
        );


        this.updateVideo(
            movie
        );


        /*
        Rebind all persistent controls
        against the newly-created DOM.
        */

        this.rebindPersistentControls();


        /*
        Bind events to the new video.
        */

        this.bindVideoEvents();


        /*
        Movie is selected but playback
        has not yet been requested.
        */

        this.state =
            "selected";


        /*
        Initial visual state.
        */

        this.showPoster();


        /*
        Reset playback UI.
        */

        this.updateCinematicTime(
            0,
            0
        );


        this.updateCinematicProgress(
            0
        );


        this.updateCinematicBufferedProgress(
            0
        );


        this.updatePlaybackControls(
            "selected"
        );


        /*
        PiP becomes available once a movie
        has been loaded into the Theatre.
        */

        if (
            this.elements.pictureInPicture
        ) {

            this.elements.pictureInPicture.hidden =
                false;

        }

    }


    /*==============================================
        Render Empty
    ==============================================*/

    renderEmpty() {

        /*
        Stop current media.
        */

        this.resetVideo();


        const screen =
            this.elements.screen;


        if (!screen) {

            return;

        }


        screen.innerHTML =
            miniTheatreTemplates.emptyState();


        /*
        Clear dynamic references.
        */

        this.clearTheatreReferences();


        this.state =
            "empty";

    }


    /*==============================================
        Clear Theatre References
    ==============================================*/

    clearTheatreReferences() {

        const theatreElements = [

            "media",

            "content",

            "overlay",

            "metadata",

            "controls",

            "placeholder",

            "poster",

            "video",

            "title",

            "overview",

            "playButton",

            "resumeButton",

            "removeButton",

            "pictureInPicture",

            "cinematicControls",

            "cinematicPlay",

            "cinematicPause",

            "cinematicVolume",

            "cinematicVolumeSlider",

            "currentTime",

            "duration",

            "cinematicProgress",

            "cinematicProgressFill",

            "cinematicProgressBuffer",

            "cinematicProgressPreview",

            "cinematicProgressPlayhead",

            "cinematicPip",

            "cinematicFullscreen",

            "cinematicSkipBackward",

            "cinematicSkipForward",

            "cinematicSettings",

            "cinematicSettingsMenu",

            "cinematicSettingsClose",

            "cinematicSpeedOptions",

            "cinematicQuality",

            "qualityOptions",

            "settings",

            "settingsButton",

            "settingsMenu",

            "settingsMain",

            "settingsClose",

            "settingsBackButtons",

            "settingsItems",

            "settingsSubmenus",

            "settingsOptions",

            "settingsSpeedOptions",

            "settingsQualityOptions"

        ];


        theatreElements.forEach(
            key => {

                this.elements[key] =
                    null;

            }
        );

    }


    /*==============================================
        Reset Video
    ==============================================*/

    resetVideo() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        try {

            /*
            Stop the current media.
            */

            if (!video.paused) {

                video.pause();

            }


            /*
            Remove source.
            */

            video.removeAttribute(
                "src"
            );


            /*
            Reset resource state.
            */

            video.load();

        } catch (error) {

            console.warn(
                "Mini Theatre: Failed to reset video.",
                error
            );

        }

    }


    /*==============================================
        Clear
    ==============================================*/

    clear() {

        this.renderEmpty();


        if (this.elements.playlist) {

            this.elements.playlist.innerHTML =
                "";

        }


        this.updateCounter(
            0
        );

    }


    /*==============================================
        Show Poster
    ==============================================*/

    showPoster() {

        const poster =
            this.elements.poster;

        const video =
            this.elements.video;

        const content =
            this.elements.content;


        if (!poster || !video) {

            return;

        }


        /*
        Presentation only.

        DO NOT call video.pause().
        */

        video.hidden =
            true;


        poster.hidden =
            false;


        if (content) {

            content.hidden =
                false;

        }


        if (this.elements.theatre) {

            this.elements.theatre.classList.remove(
                "mini-theatre--playing"
            );

        }

    }


    /*==============================================
        Show Video
    ==============================================*/

    showVideo() {

        const poster =
            this.elements.poster;

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        if (poster) {

            poster.hidden =
                true;

        }


        video.hidden =
            false;


        if (this.elements.theatre) {

            this.elements.theatre.classList.add(
                "mini-theatre--playing"
            );

        }

    }


    /*==============================================
        Play Video
    ==============================================*/

    async playVideo() {

        const video =
            this.elements.video;


        if (!video) {

            return false;

        }


        if (!video.currentSrc &&
            !video.src
        ) {

            console.error(
                "Mini Theatre: Cannot play video without a source."
            );

            return false;

        }


        /*
        Presentation only.
        */

        this.showVideo();


        try {

            await video.play();


            this.state =
                "playing";


            this.updatePlaybackControls(
                "playing"
            );


            return true;

        } catch (error) {

            /*
            AbortError can occur when
            playback is interrupted.
            */

            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                console.warn(
                    "Mini Theatre: Playback request was interrupted.",
                    error
                );

                return false;

            }


            console.error(
                "Mini Theatre: Video playback failed.",
                error
            );


            this.state =
                "selected";


            this.updatePlaybackControls(
                "selected"
            );


            return false;

        }

    }


    /*==============================================
        Pause Video
    ==============================================*/

    pauseVideo() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        video.pause();


        if (!video.ended) {

            this.state =
                "paused";


            this.updatePlaybackControls(
                "paused"
            );

        }

    }


    /*==============================================
        Resume Video
    ==============================================*/

    async resumeVideo() {

        return this.playVideo();

    }


    /*==============================================
        Restart Video
    ==============================================*/

    restartVideo() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        video.pause();


        video.currentTime =
            0;


        this.state =
            "selected";


        this.showPoster();


        this.updateCinematicTime(
            0,
            video.duration
        );


        this.updateCinematicProgress(
            0
        );


        this.updatePlaybackControls(
            "selected"
        );

    }


    /*==============================================
        Update Poster
    ==============================================*/

    updatePoster(movie) {

        const poster =
            this.elements.poster;


        if (!poster || !movie) {

            return;

        }


        poster.src =
            movie.poster || "";


        poster.alt =
            movie.title || "";

    }


    /*==============================================
        Update Video
    ==============================================*/

    updateVideo(movie) {

        const video =
            this.elements.video;


        if (!video || !movie) {

            return;

        }


        if (!movie.id) {

            console.error(
                "Mini Theatre: Movie has no ID.",
                movie
            );


            video.removeAttribute(
                "src"
            );


            return;

        }


        const streamUrl =
            `http://localhost:5000/api/videos/${movie.id}`;


        /*
        Assign source.

        Playback is intentionally NOT started here.
        */

        video.src =
            streamUrl;


        /*
        Enable browser-level automatic PiP
        when supported by the current browser.
        This is additive and does not replace
        the existing PiP controller/observer.
        */

        try {

            if (
                "autoPictureInPicture" in video
            ) {

                video.autoPictureInPicture =
                    true;

            }

        } catch (error) {

            /*
            Some browsers expose the property
            but may reject assignment.
            */

            console.debug(
                "Mini Theatre: Automatic PiP is not available.",
                error
            );

        }


        /*
        Start loading the resource.
        */

        video.load();


        console.log(
            "Mini Theatre stream URL:",
            streamUrl
        );

    }


    /*==============================================
        Bind Video Events
    ==============================================*/

    bindVideoEvents() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        /*------------------------------------------
            Time
        ------------------------------------------*/

        const updateTime =
            () => {

                const currentTime =
                    video.currentTime;


                const duration =
                    video.duration;


                this.updateCinematicTime(
                    currentTime,
                    duration
                );


                if (
                    Number.isFinite(duration) &&
                    duration > 0
                ) {

                    const progress =
                        (
                            currentTime /
                            duration
                        ) * 100;


                    this.updateCinematicProgress(
                        progress
                    );

                }

            };


        video.addEventListener(
            "timeupdate",
            updateTime
        );


        video.addEventListener(
            "loadedmetadata",
            updateTime
        );


        video.addEventListener(
            "durationchange",
            updateTime
        );


        /*------------------------------------------
            Buffer
        ------------------------------------------*/

        video.addEventListener(
            "progress",
            () => {

                if (
                    video.buffered.length === 0 ||
                    !Number.isFinite(video.duration) ||
                    video.duration <= 0
                ) {

                    return;

                }


                const bufferedEnd =
                    video.buffered.end(
                        video.buffered.length - 1
                    );


                const bufferedProgress =
                    (
                        bufferedEnd /
                        video.duration
                    ) * 100;


                this.updateCinematicBufferedProgress(
                    bufferedProgress
                );

            }
        );


        /*------------------------------------------
            Play
        ------------------------------------------*/

        video.addEventListener(
            "play",
            () => {

                this.state =
                    "playing";


                this.showVideo();


                this.updatePlaybackControls(
                    "playing"
                );

            }
        );


        /*------------------------------------------
            Pause
        ------------------------------------------*/

        video.addEventListener(
            "pause",
            () => {

                if (video.ended) {

                    return;

                }


                this.state =
                    "paused";


                this.updatePlaybackControls(
                    "paused"
                );

            }
        );


        /*------------------------------------------
            Ended
        ------------------------------------------*/

        video.addEventListener(
            "ended",
            () => {

                this.state =
                    "completed";


                this.updatePlaybackControls(
                    "completed"
                );


                this.updateCinematicProgress(
                    100
                );


                if (
                    typeof this.handlers.onEnded ===
                    "function"
                ) {

                    this.handlers.onEnded();

                }

            }
        );


        /*------------------------------------------
            Volume
        ------------------------------------------*/

        video.addEventListener(
            "volumechange",
            () => {

                this.syncVolumeUI();

            }
        );


        /*------------------------------------------
            Error
        ------------------------------------------*/

        video.addEventListener(
            "error",
            () => {

                console.error(
                    "Mini Theatre: Video element error.",
                    video.error
                );

            }
        );


        updateTime();

        this.syncVolumeUI();

    }


    /*==============================================
        Bind Ended
    ==============================================*/

    bindEnded(handler) {

        this.handlers.onEnded =
            handler;

    }


    /*==============================================
        Rebind Persistent Controls
    ==============================================*/

    rebindPersistentControls() {

        /*
        Theatre-level controls.
        */

        this.bindPlay(
            this.handlers.onPlay
        );


        this.bindResume(
            this.handlers.onResume
        );


        this.bindRemove(
            this.handlers.onRemove
        );


        /*
        Cinematic playback.
        */

        this.bindCinematicPlaybackControls({

            onPlay: this.handlers.onPlay,

            onPause: this.handlers.onPause

        });


        /*
        Volume.
        */

        this.bindCinematicVolume({

            onToggleMute: this.handlers.onToggleMute,

            onVolumeChange: this.handlers.onVolumeChange

        });


        /*
        Picture in Picture.
        */

        this.bindPictureInPicture(
            this.handlers.onPictureInPicture
        );


        this.bindCinematicPictureInPicture(
            this.handlers.onPictureInPicture
        );


        /*
        Fullscreen.
        */

        this.bindCinematicFullscreen(
            this.handlers.onFullscreen
        );


        /*
        Skip.
        */

        this.bindCinematicSkipControls({

            onSkipBackward: this.handlers.onSkipBackward,

            onSkipForward: this.handlers.onSkipForward

        });


        /*
        Progress.
        */

        this.bindCinematicProgress();


        /*
        Settings.
        */

        this.bindCinematicSettings({

            onSpeedChange: this.handlers.onSpeedChange,

            onQualityChange: this.handlers.onQualityChange

        });

    }


    /*==============================================
        Update Playback Controls
    ==============================================*/

    updatePlaybackControls(state) {

        const play =
            this.elements.cinematicPlay;

        const pause =
            this.elements.cinematicPause;


        if (!play || !pause) {

            return;

        }


        play.hidden =
            state === "playing";


        pause.hidden =
            state !== "playing";

    }


    /*==============================================
        Bind Play
    ==============================================*/

    bindPlay(handler) {

        if (handler !== undefined) {

            this.handlers.onPlay =
                handler;

        }


        const button =
            this.elements.playButton;


        if (!button) {

            return;

        }


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof this.handlers.onPlay ===
                    "function"
                ) {

                    this.handlers.onPlay();

                }

            };

    }


    /*==============================================
        Bind Resume
    ==============================================*/

    bindResume(handler) {

        if (handler !== undefined) {

            this.handlers.onResume =
                handler;

        }


        const button =
            this.elements.resumeButton;


        if (!button) {

            return;

        }


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof this.handlers.onResume ===
                    "function"
                ) {

                    this.handlers.onResume();

                }

            };

    }


    /*==============================================
        Bind Remove
    ==============================================*/

    bindRemove(handler) {

        if (handler !== undefined) {

            this.handlers.onRemove =
                handler;

        }


        const button =
            this.elements.removeButton;


        if (!button) {

            return;

        }


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof this.handlers.onRemove ===
                    "function"
                ) {

                    this.handlers.onRemove();

                }

            };

    }


    /*==============================================
        Bind Picture in Picture
    ==============================================*/

    bindPictureInPicture(handler) {

        if (handler !== undefined) {

            this.handlers.onPictureInPicture =
                handler;

        }


        const button =
            this.elements.pictureInPicture;


        if (!button) {

            return;

        }


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof this.handlers.onPictureInPicture ===
                    "function"
                ) {

                    this.handlers.onPictureInPicture();

                }

            };

    }


    /*==============================================
        Bind Cinematic Playback
    ==============================================*/

    bindCinematicPlaybackControls({

        onPlay,

        onPause

    } = {}) {

        if (onPlay !== undefined) {

            this.handlers.onPlay =
                onPlay;

        }


        if (onPause !== undefined) {

            this.handlers.onPause =
                onPause;

        }


        const play =
            this.elements.cinematicPlay;


        const pause =
            this.elements.cinematicPause;


        if (play) {

            play.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onPlay ===
                        "function"
                    ) {

                        this.handlers.onPlay();

                    }

                };

        }


        if (pause) {

            pause.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onPause ===
                        "function"
                    ) {

                        this.handlers.onPause();

                    }

                };

        }

    }


    /*==============================================
        Bind Cinematic Volume
    ==============================================*/

    bindCinematicVolume({

        onToggleMute,

        onVolumeChange

    } = {}) {

        if (onToggleMute !== undefined) {

            this.handlers.onToggleMute =
                onToggleMute;

        }


        if (onVolumeChange !== undefined) {

            this.handlers.onVolumeChange =
                onVolumeChange;

        }


        const button =
            this.elements.cinematicVolume;


        const slider =
            this.elements.cinematicVolumeSlider;


        if (button) {

            button.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onToggleMute ===
                        "function"
                    ) {

                        this.handlers.onToggleMute();

                    }

                };

        }


        if (slider) {

            slider.oninput =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    const value =
                        Number(
                            event.target.value
                        );


                    if (
                        typeof this.handlers.onVolumeChange ===
                        "function"
                    ) {

                        this.handlers.onVolumeChange(
                            value
                        );

                    }

                };

        }


        this.syncVolumeUI();

    }


    /*==============================================
        Sync Volume UI
    ==============================================*/

    syncVolumeUI() {

        const video =
            this.elements.video;


        if (!video) {

            return;

        }


        const slider =
            this.elements.cinematicVolumeSlider;


        if (slider) {

            slider.value =
                String(
                    Math.round(
                        video.volume * 100
                    )
                );

        }


        const button =
            this.elements.cinematicVolume;


        if (button) {

            button.classList.toggle(
                "is-muted",
                video.muted ||
                video.volume === 0
            );

        }

    }


    /*==============================================
        Bind Volume Synchronization
    ==============================================*/

    bindVolumeSynchronization(handler) {

        const video =
            this.elements.video;


        if (!video ||
            typeof handler !==
            "function"
        ) {

            return;

        }


        video.addEventListener(
            "volumechange",
            handler
        );

    }


    /*==============================================
        Bind Cinematic PiP
    ==============================================*/

    bindCinematicPictureInPicture(handler) {

        if (handler !== undefined) {

            this.handlers.onPictureInPicture =
                handler;

        }


        const button =
            this.elements.cinematicPip;


        if (!button) {

            return;

        }


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof this.handlers.onPictureInPicture ===
                    "function"
                ) {

                    this.handlers.onPictureInPicture();

                }

            };

    }


    /*==============================================
        Bind Cinematic Fullscreen
    ==============================================*/

    bindCinematicFullscreen(handler) {

            if (handler !== undefined) {

                this.handlers.onFullscreen =
                    handler;

            }


            const button =
                this.elements.cinematicFullscreen;


            if (!button) {

                return;

            }


            button.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onFullscreen ===
                        "function"
                    ) {

                        this.handlers.onFullscreen();

                    }

                };

        }
        /*==============================================
             Bind Cinematic Skip
         ==============================================*/
    bindCinematicSkip({
            onBackward,
            onForward
        } = {}) {

            this.bindCinematicSkipControls({
                onSkipBackward: onBackward,
                onSkipForward: onForward
            });
        }
        /*==============================================
            Bind Cinematic Skip Controls
        ==============================================*/

    bindCinematicSkipControls({

        onSkipBackward,

        onSkipForward

    } = {}) {

        if (onSkipBackward !== undefined) {

            this.handlers.onSkipBackward =
                onSkipBackward;

        }


        if (onSkipForward !== undefined) {

            this.handlers.onSkipForward =
                onSkipForward;

        }


        const backward =
            this.elements.cinematicSkipBackward;


        const forward =
            this.elements.cinematicSkipForward;


        if (backward) {

            backward.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onSkipBackward ===
                        "function"
                    ) {

                        this.handlers.onSkipBackward();

                    }

                };

        }


        if (forward) {

            forward.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        typeof this.handlers.onSkipForward ===
                        "function"
                    ) {

                        this.handlers.onSkipForward();

                    }

                };

        }

    }


    /*==============================================
        Bind Cinematic Progress
    ==============================================*/

    bindCinematicProgress() {

        const progress =
            this.elements.cinematicProgress;


        const video =
            this.elements.video;


        if (!progress || !video) {

            return;

        }


        const seekToPosition =
            percentage => {

                if (!Number.isFinite(
                        video.duration
                    ) ||
                    video.duration <= 0
                ) {

                    return;

                }


                const value =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            percentage
                        )
                    );


                video.currentTime =
                    value *
                    video.duration;

            };


        const getPointerPercentage =
            event => {

                const rect =
                    progress.getBoundingClientRect();


                if (!rect.width) {

                    return 0;

                }


                return Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            event.clientX -
                            rect.left
                        ) /
                        rect.width
                    )
                );

            };


        progress.onclick =
            event => {

                seekToPosition(
                    getPointerPercentage(
                        event
                    )
                );

            };


        progress.onpointerdown =
            event => {

                event.preventDefault();


                progress.setPointerCapture(
                    event.pointerId
                );


                seekToPosition(
                    getPointerPercentage(
                        event
                    )
                );

            };


        progress.onpointermove =
            event => {

                if (!progress.hasPointerCapture(
                        event.pointerId
                    )) {

                    return;

                }


                seekToPosition(
                    getPointerPercentage(
                        event
                    )
                );

            };


        progress.onpointerup =
            event => {

                if (
                    progress.hasPointerCapture(
                        event.pointerId
                    )
                ) {

                    progress.releasePointerCapture(
                        event.pointerId
                    );

                }

            };


        progress.onkeydown =
            event => {

                if (!Number.isFinite(
                        video.duration
                    ) ||
                    video.duration <= 0
                ) {

                    return;

                }


                let percentage =
                    video.currentTime /
                    video.duration;


                switch (event.key) {

                    case "ArrowLeft":

                        event.preventDefault();

                        percentage -=
                            0.05;

                        break;


                    case "ArrowRight":

                        event.preventDefault();

                        percentage +=
                            0.05;

                        break;


                    case "Home":

                        event.preventDefault();

                        percentage =
                            0;

                        break;


                    case "End":

                        event.preventDefault();

                        percentage =
                            1;

                        break;


                    default:

                        return;

                }


                seekToPosition(
                    percentage
                );

            };

    }


    /*==============================================
        Bind Cinematic Settings
    ==============================================*/

    bindCinematicSettings({

        onSpeedChange,

        onQualityChange

    } = {}) {

        if (onSpeedChange !== undefined) {

            this.handlers.onSpeedChange =
                onSpeedChange;

        }


        if (onQualityChange !== undefined) {

            this.handlers.onQualityChange =
                onQualityChange;

        }


        const button =
            this.elements.cinematicSettings;


        const menu =
            this.elements.cinematicSettingsMenu;


        if (!button || !menu) {

            return;

        }


        const closeButton =
            this.elements.cinematicSettingsClose;


        const items =
            this.elements.settingsItems;


        const backButtons =
            this.elements.settingsBackButtons;


        const speedOptions =
            this.elements.settingsSpeedOptions;


        const qualityOptions =
            this.elements.settingsQualityOptions;


        const closeSettings =
            () => {

                this.hideSettings();

                this.showSettingsMain();

            };


        const openSettings =
            () => {

                this.showSettings();

            };


        button.onclick =
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (menu.hidden) {

                    openSettings();

                } else {

                    closeSettings();

                }

            };


        if (closeButton) {

            closeButton.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    closeSettings();

                };

        }


        items.forEach(
            item => {

                item.onclick =
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const setting =
                            item.dataset.setting;


                        if (!setting) {

                            return;

                        }


                        this.showSettingsSubmenu(
                            setting
                        );

                    };

            }
        );


        backButtons.forEach(
            backButton => {

                backButton.onclick =
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        this.showSettingsMain();

                    };

            }
        );


        speedOptions.forEach(
            option => {

                option.onclick =
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const rate =
                            Number(
                                option.dataset.playbackRate
                            );


                        if (!Number.isFinite(rate)) {

                            return;

                        }


                        this.setActivePlaybackRate(
                            rate
                        );


                        if (
                            typeof this.handlers.onSpeedChange ===
                            "function"
                        ) {

                            this.handlers.onSpeedChange(
                                rate
                            );

                        }


                        this.showSettingsMain();

                    };

            }
        );


        qualityOptions.forEach(
            option => {

                option.onclick =
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const quality =
                            option.dataset.quality;


                        if (!quality) {

                            return;

                        }


                        this.setActiveQuality(
                            quality
                        );


                        if (
                            typeof this.handlers.onQualityChange ===
                            "function"
                        ) {

                            this.handlers.onQualityChange(
                                quality
                            );

                        }


                        this.showSettingsMain();

                    };

            }
        );


        menu.onkeydown =
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                event.preventDefault();


                closeSettings();


                button.focus();

            };


        menu.onclick =
            event => {

                event.stopPropagation();

            };


        this.bindSettingsOutsideClick();

    }


    /*==============================================
        Bind Settings Outside Click
    ==============================================*/

    bindSettingsOutsideClick() {

        if (this.settingsOutsideClickBound) {

            return;

        }


        document.addEventListener(
            "click",
            event => {

                const menu =
                    this.elements.cinematicSettingsMenu;


                const button =
                    this.elements.cinematicSettings;


                if (!menu ||
                    !button ||
                    menu.hidden
                ) {

                    return;

                }


                if (
                    menu.contains(
                        event.target
                    ) ||
                    button.contains(
                        event.target
                    )
                ) {

                    return;

                }


                this.hideSettings();

            }
        );


        this.settingsOutsideClickBound =
            true;

    }


    /*==============================================
        Show Settings
    ==============================================*/

    showSettings() {

        const menu =
            this.elements.cinematicSettingsMenu;


        const button =
            this.elements.cinematicSettings;


        if (!menu) {

            return;

        }


        menu.hidden =
            false;


        menu.setAttribute(
            "aria-hidden",
            "false"
        );


        menu.classList.add(
            "is-open"
        );


        if (button) {

            button.setAttribute(
                "aria-expanded",
                "true"
            );


            button.classList.add(
                "is-active"
            );

        }

    }


    /*==============================================
        Hide Settings
    ==============================================*/

    hideSettings() {

        const menu =
            this.elements.cinematicSettingsMenu;


        const button =
            this.elements.cinematicSettings;


        if (!menu) {

            return;

        }


        menu.hidden =
            true;


        menu.setAttribute(
            "aria-hidden",
            "true"
        );


        menu.classList.remove(
            "is-open"
        );


        if (button) {

            button.setAttribute(
                "aria-expanded",
                "false"
            );


            button.classList.remove(
                "is-active"
            );

        }

    }


    /*==============================================
        Toggle Settings
    ==============================================*/

    toggleSettings() {

        const menu =
            this.elements.cinematicSettingsMenu;


        if (!menu) {

            return;

        }


        if (menu.hidden) {

            this.showSettings();

        } else {

            this.hideSettings();

        }

    }


    /*==============================================
        Show Settings Main
    ==============================================*/

    showSettingsMain() {

        const main =
            this.elements.settingsMain;


        const submenus =
            this.elements.settingsSubmenus;


        if (main) {

            main.hidden =
                false;

        }


        if (submenus) {

            submenus.forEach(
                submenu => {

                    submenu.hidden =
                        true;

                }
            );

        }

    }


    /*==============================================
        Show Settings Submenu
    ==============================================*/

    showSettingsSubmenu(setting) {

        if (!setting) {

            return;

        }


        const main =
            this.elements.settingsMain;


        const submenus =
            this.elements.settingsSubmenus;


        if (main) {

            main.hidden =
                true;

        }


        if (submenus) {

            submenus.forEach(
                submenu => {

                    submenu.hidden =
                        submenu.dataset.settingsPanel !==
                        setting;

                }
            );

        }

    }


    /*==============================================
        Show Settings Panel
    ==============================================*/

    showSettingsPanel(panel) {

        this.showSettingsSubmenu(
            panel
        );

    }


    /*==============================================
        Set Settings Panel State
    ==============================================*/

    setSettingsPanelState(open) {

        const menu =
            this.elements.cinematicSettingsMenu;


        if (!menu) {

            return;

        }


        menu.hidden = !open;


        menu.classList.toggle(
            "is-open",
            open
        );

    }


    /*==============================================
        Set Playback Rate
    ==============================================*/

    setPlaybackRate(rate) {

        const video =
            this.elements.video;


        if (!video ||
            !Number.isFinite(rate)
        ) {

            return;

        }


        video.playbackRate =
            rate;


        this.setActivePlaybackRate(
            rate
        );

    }


    /*==============================================
        Set Active Playback Rate
    ==============================================*/

    setActivePlaybackRate(rate) {

        const options =
            this.elements.settingsSpeedOptions;


        if (!options) {

            return;

        }


        options.forEach(
            option => {

                const optionRate =
                    Number(
                        option.dataset.playbackRate
                    );


                const active =
                    optionRate === rate;


                option.classList.toggle(
                    "mini-theatre__settings-option--active",
                    active
                );


                const check =
                    option.querySelector(
                        '[aria-hidden="true"]'
                    );


                if (check) {

                    check.textContent =
                        active ?
                        "✓" :
                        "";

                }

            }
        );


        const menu =
            this.elements.settingsMenu;


        if (!menu) {

            return;

        }


        const value =
            menu.querySelector(
                '[data-setting-value="playback-speed"]'
            );


        if (!value) {

            return;

        }


        const labels = {

            0.5: "0.5×",

            0.75: "0.75×",

            1: "Normal",

            1.25: "1.25×",

            1.5: "1.5×",

            1.75: "1.75×",

            2: "2×"

        };


        value.textContent =
            labels[rate] ||
            `${rate}×`;

    }


    /*==============================================
        Set Active Quality
    ==============================================*/

    setActiveQuality(quality) {

        const options =
            this.elements.settingsQualityOptions;


        if (!options) {

            return;

        }


        options.forEach(
            option => {

                const active =
                    option.dataset.quality ===
                    quality;


                option.classList.toggle(
                    "mini-theatre__settings-option--active",
                    active
                );


                const check =
                    option.querySelector(
                        '[aria-hidden="true"]'
                    );


                if (check) {

                    check.textContent =
                        active ?
                        "✓" :
                        "";

                }

            }
        );


        /*
        Update the visible quality summary
        if the template provides one.
        */

        const menu =
            this.elements.settingsMenu;


        if (!menu) {

            return;

        }


        const value =
            menu.querySelector(
                '[data-setting-value="quality"]'
            );


        if (!value) {

            return;

        }


        const activeOption =
            Array.from(
                options
            ).find(
                option =>
                option.dataset.quality ===
                quality
            );


        if (activeOption) {

            value.textContent =
                activeOption.textContent
                .replace(
                    "✓",
                    ""
                )
                .trim();

        } else {

            value.textContent =
                quality;

        }

    }


    /*==============================================
        Update Cinematic Time
    ==============================================*/

    updateCinematicTime(
        currentTime,
        duration
    ) {

        if (this.elements.currentTime) {

            this.elements.currentTime.textContent =
                this.formatTime(
                    currentTime
                );

        }


        if (this.elements.duration) {

            this.elements.duration.textContent =
                this.formatTime(
                    duration
                );

        }

    }


    /*==============================================
        Format Time
    ==============================================*/

    formatTime(seconds) {

        if (!Number.isFinite(seconds) ||
            seconds < 0
        ) {

            return "00:00";

        }


        seconds =
            Math.floor(
                seconds
            );


        const hours =
            Math.floor(
                seconds / 3600
            );


        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );


        const remainingSeconds =
            seconds % 60;


        if (hours > 0) {

            return [

                String(hours)
                .padStart(2, "0"),

                String(minutes)
                .padStart(2, "0"),

                String(remainingSeconds)
                .padStart(2, "0")

            ].join(":");

        }


        return [

            String(minutes)
            .padStart(2, "0"),

            String(remainingSeconds)
            .padStart(2, "0")

        ].join(":");

    }


    /*==============================================
        Update Cinematic Progress
    ==============================================*/

    updateCinematicProgress(progress) {

        if (!Number.isFinite(progress)) {

            return;

        }


        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            );


        if (
            this.elements.cinematicProgressFill
        ) {

            this.elements.cinematicProgressFill.style.width =
                `${value}%`;

        }


        if (
            this.elements.cinematicProgressPlayhead
        ) {

            this.elements.cinematicProgressPlayhead.style.left =
                `${value}%`;

        }


        if (
            this.elements.cinematicProgress
        ) {

            this.elements.cinematicProgress.setAttribute(
                "aria-valuenow",
                String(
                    Math.round(value)
                )
            );

        }

    }


    /*==============================================
        Update Buffered Progress
    ==============================================*/

    updateCinematicBufferedProgress(
        progress
    ) {

        if (!Number.isFinite(progress)) {

            return;

        }


        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            );


        if (
            this.elements.cinematicProgressBuffer
        ) {

            this.elements.cinematicProgressBuffer.style.width =
                `${value}%`;

        }

    }


    /*==============================================
        Update Progress Preview
    ==============================================*/

    updateCinematicProgressPreview(
        percentage
    ) {

        const preview =
            this.elements.cinematicProgressPreview;


        const video =
            this.elements.video;


        if (!preview || !video) {

            return;

        }


        if (!Number.isFinite(video.duration) ||
            video.duration <= 0
        ) {

            return;

        }


        const value =
            Math.max(
                0,
                Math.min(
                    1,
                    percentage
                )
            );


        const previewTime =
            value *
            video.duration;


        preview.textContent =
            this.formatTime(
                previewTime
            );


        preview.style.left =
            `${value * 100}%`;

    }


    /*==============================================
        Bind Pointer Move
    ==============================================*/

    bindPointerMove(handler) {

        if (!this.elements.theatre ||
            typeof handler !==
            "function"
        ) {

            return;

        }


        this.elements.theatre.onmousemove =
            handler;

    }


    /*==============================================
        Bind Theatre Tap
    ==============================================*/

    bindTheatreTap(handler) {

        if (!this.elements.theatre ||
            typeof handler !==
            "function"
        ) {

            return;

        }


        this.elements.theatre.onclick =
            handler;

    }


    /*==============================================
        Handle Theatre Tap
    ==============================================*/

    handleTheatreTap() {

        /*
        Interaction logic belongs to
        the controller.
        */

    }


    /*==============================================
        Get Overlay
    ==============================================*/

    getOverlay() {

        return (
            this.elements.overlay ||
            null
        );

    }


    /*==============================================
        Show Overlay
    ==============================================*/

    showOverlay() {

        const theatre =
            this.elements.theatre;

        const overlay =
            this.getOverlay();


        if (theatre) {

            theatre.classList.add(
                "mini-theatre--overlay"
            );

        }


        if (overlay) {

            overlay.classList.add(
                "is-visible"
            );

        }

    }


    /*==============================================
        Hide Overlay
    ==============================================*/

    hideOverlay() {

        const theatre =
            this.elements.theatre;

        const overlay =
            this.getOverlay();


        if (theatre) {

            theatre.classList.remove(
                "mini-theatre--overlay"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "is-visible"
            );

        }

    }


    /*==============================================
        Render Playlist
    ==============================================*/

    renderPlaylist(movies = []) {

        const playlist =
            this.elements.playlist;


        if (!playlist) {

            return;

        }


        playlist.innerHTML =
            movies
            .map(
                (movie, index) =>
                miniTheatreTemplates.playlistCard(
                    movie,
                    index
                )
            )
            .join("");


        this.updateCounter(
            movies.length
        );

    }


    /*==============================================
        Bind Playlist Actions
    ==============================================*/

    bindPlaylistActions(handler) {

        this.handlers.onPlaylistAction =
            handler;


        const playlist =
            this.elements.playlist;


        if (!playlist ||
            typeof handler !==
            "function"
        ) {

            return;

        }


        playlist.onclick =
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) {

                    return;

                }


                const card =
                    button.closest(
                        ".playlist-card"
                    );


                if (!card) {

                    return;

                }


                const index =
                    Number(
                        card.dataset.index
                    );


                if (!Number.isInteger(index)) {

                    return;

                }


                const action =
                    button.dataset.action;


                if (!action) {

                    return;

                }


                handler({

                    index,

                    action

                });

            };

    }


    /*==============================================
        Set Active Card
    ==============================================*/

    setActive(index) {

        const playlist =
            this.elements.playlist;


        if (!playlist) {

            return;

        }


        playlist
            .querySelectorAll(
                ".playlist-card"
            )
            .forEach(
                card => {

                    const active =
                        Number(
                            card.dataset.index
                        ) === index;


                    card.classList.toggle(
                        "is-active",
                        active
                    );


                    if (active) {

                        card.setAttribute(
                            "aria-current",
                            "true"
                        );

                    } else {

                        card.removeAttribute(
                            "aria-current"
                        );

                    }

                }
            );

    }


    /*==============================================
        Scroll Active Card
    ==============================================*/

    scrollToActive(index) {

        const playlist =
            this.elements.playlist;


        if (!playlist) {

            return;

        }


        const active =
            playlist.querySelector(
                `.playlist-card[data-index="${index}"]`
            );


        if (!active) {

            return;

        }


        active.scrollIntoView({

            behavior: "smooth",

            block: "nearest",

            inline: "nearest"

        });

    }


    /*==============================================
        Update Card State
    ==============================================*/

    updateCardState(
        index,
        state = {}
    ) {

        const playlist =
            this.elements.playlist;


        if (!playlist) {

            return;

        }


        const card =
            playlist.querySelector(
                `.playlist-card[data-index="${index}"]`
            );


        if (!card) {

            return;

        }


        const status =
            card.querySelector(
                ".playlist-card__status"
            );


        const progressFill =
            card.querySelector(
                ".playlist-card__progress-fill"
            );


        const progressBar =
            card.querySelector(
                ".playlist-card__progress"
            );


        const play =
            card.querySelector(
                ".playlist-card__action--play"
            );


        const pause =
            card.querySelector(
                ".playlist-card__action--pause"
            );


        const resume =
            card.querySelector(
                ".playlist-card__action--resume"
            );


        const remove =
            card.querySelector(
                ".playlist-card__action--remove"
            );


        const completedBadge =
            card.querySelector(
                ".playlist-card__completed"
            );


        /*------------------------------------------
            Active Card
        ------------------------------------------*/

        const isActive =
            state.active !== undefined ?
            state.active === true :
            card.classList.contains(
                "is-active"
            );


        /*------------------------------------------
            Progress
        ------------------------------------------*/

        const progress =
            Number.isFinite(
                state.progress
            ) ?
            Math.max(
                0,
                Math.min(
                    100,
                    state.progress
                )
            ) :
            0;


        /*------------------------------------------
            Completion
        ------------------------------------------*/

        const isCompleted =
            state.completed === true ||
            progress >= 100 ||
            state.status ===
            "🔵 COMPLETE";


        /*------------------------------------------
            Playing
        ------------------------------------------*/

        const isPlaying = !isCompleted &&
            (
                state.playing === true ||
                (
                    state.play === false &&
                    state.pause === true
                )
            );


        const isPaused = !isCompleted &&
            !isPlaying &&
            (
                state.paused === true ||
                (
                    state.resume === true &&
                    state.pause !== true
                )
            );


        const isReady = !isCompleted &&
            !isPlaying &&
            !isPaused;


        /*------------------------------------------
            Status
        ------------------------------------------*/

        if (status) {

            /*
            Inactive cards do not display
            playback status.
            */

            status.hidden = !isActive;


            if (isCompleted) {

                status.textContent =
                    "🔵 COMPLETE";

            } else if (isPlaying) {

                status.textContent =
                    "🔴 PLAYING";

            } else if (isPaused) {

                status.textContent =
                    "🟡 PAUSED";

            } else if (isReady) {

                status.textContent =
                    state.status ||
                    "⚪ READY";

            }

        }


        /*------------------------------------------
            Progress
        ------------------------------------------*/

        if (progressFill) {

            progressFill.style.width =
                `${progress}%`;

        }


        if (progressBar) {

            progressBar.setAttribute(
                "aria-valuenow",
                String(
                    Math.round(
                        progress
                    )
                )
            );

        }


        /*------------------------------------------
            Playback Actions
        ------------------------------------------*/

        if (play) {

            play.hidden = !isReady;

        }


        if (pause) {

            pause.hidden = !isPlaying;

        }


        if (resume) {

            resume.hidden = !isPaused;

        }


        /*
        Remove remains visible on every card.
        */

        if (remove) {

            remove.hidden =
                false;

        }


        /*------------------------------------------
            Completed Badge
        ------------------------------------------*/

        if (completedBadge) {

            completedBadge.hidden = !isCompleted;

        }


        /*------------------------------------------
            Card Classes
        ------------------------------------------*/

        card.classList.toggle(
            "playlist-card--completed",
            isCompleted
        );


        card.classList.toggle(
            "playlist-card--playing",
            isPlaying
        );


        card.classList.toggle(
            "playlist-card--paused",
            isPaused
        );


        card.classList.toggle(
            "playlist-card--ready",
            isReady
        );

    }


    /*==============================================
        Update Counter
    ==============================================*/

    updateCounter(count) {

        if (!this.elements.counter) {

            return;

        }


        this.elements.counter.textContent =
            String(
                Number.isFinite(count) ?
                count :
                0
            );

    }


    /*==============================================
        Set PiP State
    ==============================================*/

    setPictureInPictureState(active) {

        const button =
            this.elements.cinematicPip ||
            this.elements.pictureInPicture;


        if (!button) {

            return;

        }


        button.classList.toggle(
            "is-active",
            active === true
        );

    }


    /*==============================================
        Set Fullscreen State
    ==============================================*/

    setFullscreenState(active) {

        const button =
            this.elements.cinematicFullscreen;


        if (!button) {

            return;

        }


        button.classList.toggle(
            "is-active",
            active === true
        );

    }


    /*==============================================
        Show Resume Prompt
    ==============================================*/

    showResumePrompt(progress) {

        const value =
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
        If the template provides a dedicated
        resume prompt, update it.
        */

        const prompt =
            this.elements.screen ?
            this.elements.screen.querySelector(
                ".mini-theatre__resume-prompt"
            ) :
            null;


        if (prompt) {

            prompt.hidden =
                false;


            prompt.dataset.progress =
                String(value);

        }


        console.log(
            `Resume available at ${value}%`
        );

    }


    /*==============================================
        Get Cinematic Controls
    ==============================================*/

    getCinematicControls() {

        return this.elements.cinematicControls;

    }


    /*==============================================
        Get Cinematic Play
    ==============================================*/

    getCinematicPlay() {

        return this.elements.cinematicPlay;

    }


    /*==============================================
        Get Cinematic Pause
    ==============================================*/

    getCinematicPause() {

        return this.elements.cinematicPause;

    }


    /*==============================================
        Get Cinematic Volume
    ==============================================*/

    getCinematicVolume() {

        return this.elements.cinematicVolume;

    }


    /*==============================================
        Get Cinematic Volume Slider
    ==============================================*/

    getCinematicVolumeSlider() {

        return this.elements.cinematicVolumeSlider;

    }


    /*==============================================
        Get Current Time
    ==============================================*/

    getCurrentTimeElement() {

        return this.elements.currentTime;

    }


    /*==============================================
        Get Duration
    ==============================================*/

    getDurationElement() {

        return this.elements.duration;

    }


    /*==============================================
        Get Cinematic Progress
    ==============================================*/

    getCinematicProgress() {

        return this.elements.cinematicProgress;

    }


    /*==============================================
        Get Cinematic Progress Fill
    ==============================================*/

    getCinematicProgressFill() {

        return this.elements.cinematicProgressFill;

    }


    /*==============================================
        Get Cinematic Settings
    ==============================================*/

    getCinematicSettings() {

        return this.elements.cinematicSettings;

    }


    /*==============================================
        Get Settings Panel
    ==============================================*/

    getSettingsPanel() {

        return this.elements.cinematicSettingsMenu;

    }


    /*==============================================
        Get Video
    ==============================================*/

    getVideo() {

        return this.elements.video;

    }


    /*==============================================
        Get Screen
    ==============================================*/

    getScreen() {

        return this.elements.screen;

    }

}


/*==================================================
    Export Singleton
==================================================*/

export const miniTheatreView =
    new MiniTheatreView();