"use strict";

/*==================================================

    StreamFlix

    Mini Theatre UI Controller V4

    Responsibility

    ✓ Overlay
    ✓ Poster
    ✓ Resume Prompt
    ✓ Picture-in-Picture
    ✓ Fullscreen
    ✓ Keyboard
    ✓ Theatre Controls
    ✓ Cinematic UI Visibility
    ✓ Volume
    ✓ Settings
    ✓ Automatic Picture-in-Picture

==================================================*/

import { miniTheatreView }
from "../miniTheatreView.js";

import {
    miniTheatrePlaybackController
} from "./miniTheatrePlaybackController.js";

import {
    MINI_THEATRE_PLAYBACK_SPEEDS
} from "../miniTheatreSettingsData.js";


class MiniTheatreUIController {


    /*==============================================
        Constructor
    ==============================================*/

    constructor() {

        this.state = {

            overlayVisible: false,

            overlayTimer: null,

            isPictureInPicture: false,

            isFullscreen: false,

            autoPiPEnabled: true,

            theatreVisible: true,

            volume: 1,

            previousVolume: 1,

            isMuted: false,

            volumeSliderExpanded: false,

            /*------------------------------------------
                Settings
            ------------------------------------------*/

            settingsOpen: false,

            playbackRate: 1,

            quality: "auto",

            cinematicState: "idle"

        };


        this.cinematicHideTimer = null;

        this.cinematicControlsVisible = false;

        this.autoPiPVisibilityBound = false;

        this.autoPiPObserver = null;

        this.fullscreenStateBound = false;

        this.pictureInPictureBound = false;

    }


    /*==============================================
        Enter Cinematic Idle State
    ==============================================*/

    enterCinematicIdle() {

        this.clearOverlayTimer();

        this.state.cinematicState =
            "idle";

        this.hideOverlay();

        /*
        Keep controls visible when fullscreen.
        */

        if (!this.state.isFullscreen) {

            this.hideCinematicControls();

        }

    }


    /*==============================================
        Enter Cinematic Active State
    ==============================================*/

    enterCinematicActive() {

        if (this.state.isFullscreen) {

            this.clearOverlayTimer();

            this.hideOverlay();

            this.showCinematicControls();

            return;

        }


        this.state.cinematicState =
            "active";

        this.showOverlay();

        this.showCinematicControls();

        this.startOverlayTimer();

    }


    /*==============================================
        Enter Cinematic Paused State
    ==============================================*/

    enterCinematicPaused() {

        this.clearOverlayTimer();

        this.state.cinematicState =
            "paused";

        this.showOverlay();

        this.showCinematicControls();

    }


    /*==============================================
        Show Overlay
    ==============================================*/

    showOverlay() {

        /*
        Movie information must never appear
        while fullscreen is active.
        */

        if (this.state.isFullscreen) {

            return;

        }


        const overlay =
            miniTheatreView.getOverlay();


        if (!overlay) {

            return;

        }


        overlay.classList.add(
            "is-visible"
        );


        this.state.overlayVisible =
            true;

    }


    /*==============================================
        Hide Overlay
    ==============================================*/

    hideOverlay() {

        const overlay =
            miniTheatreView.getOverlay();


        if (!overlay) {

            return;

        }


        overlay.classList.remove(
            "is-visible"
        );


        this.state.overlayVisible =
            false;

    }


    /*==============================================
        Start Overlay Timer
    ==============================================*/

    startOverlayTimer() {

        this.clearOverlayTimer();


        if (
            this.state.cinematicState ===
            "paused"
        ) {

            return;

        }


        if (this.state.isFullscreen) {

            return;

        }


        this.state.overlayTimer =
            setTimeout(

                () => {

                    if (
                        this.state.cinematicState ===
                        "active" &&
                        !this.state.isFullscreen
                    ) {

                        this.enterCinematicIdle();

                    }

                },

                3000

            );

    }


    /*==============================================
        Clear Overlay Timer
    ==============================================*/

    clearOverlayTimer() {

        if (!this.state.overlayTimer) {

            return;

        }


        clearTimeout(
            this.state.overlayTimer
        );


        this.state.overlayTimer =
            null;

    }


    /*==============================================
        Bind Cinematic Pointer Events
    ==============================================*/

    bindCinematicPointerEvents() {

        const screen =
            miniTheatreView.getScreen();


        if (!screen) {

            return;

        }


        screen.addEventListener(
            "pointerenter",
            () => {

                this.enterCinematicActive();

            }
        );


        screen.addEventListener(
            "pointermove",
            () => {

                this.enterCinematicActive();

            }
        );


        screen.addEventListener(
            "pointerleave",
            () => {

                if (
                    this.state.cinematicState ===
                    "paused"
                ) {

                    return;

                }


                if (this.state.isFullscreen) {

                    return;

                }


                this.enterCinematicIdle();

            }
        );

    }


    /*==============================================
        Handle Pointer Move
    ==============================================*/

    handlePointerMove() {

        this.enterCinematicActive();

    }


    /*==============================================
        Show Poster
    ==============================================*/

    showPoster() {

        miniTheatreView.showPoster();

    }


    /*==============================================
        Show Video
    ==============================================*/

    showVideo() {

        miniTheatreView.showVideo();

    }


    /*==============================================
        Render Empty Theatre
    ==============================================*/

    renderEmpty() {

        this.resetTheatre();

        miniTheatreView.renderEmpty();

    }


    /*==============================================
        Reset Theatre UI
    ==============================================*/

    resetTheatre() {

        this.clearOverlayTimer();

        this.clearCinematicHideTimer();


        this.state.overlayVisible =
            false;

        this.state.isPictureInPicture =
            false;

        this.state.isFullscreen =
            false;

        this.state.cinematicState =
            "idle";

        this.state.settingsOpen =
            false;


        this.cinematicControlsVisible =
            false;


        if (this.autoPiPObserver) {

            this.autoPiPObserver.disconnect();

            this.autoPiPObserver =
                null;

        }


        miniTheatreView.hideOverlay();

        miniTheatreView.hideSettings();

        miniTheatreView.showPoster();

    }


    /*==============================================
        Synchronize Volume Controls
    ==============================================*/

    syncVolumeControls() {

        const video =
            miniTheatreView.getVideo();


        const volumeButton =
            miniTheatreView.getCinematicVolume();


        const volumeSlider =
            miniTheatreView
            .getCinematicVolumeSlider();


        if (!video) {

            return;

        }


        const volume =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(video.volume)
                )
            );


        const muted =
            video.muted ||
            volume === 0;


        /*
        --------------------------------------------
            Synchronize UI State
        --------------------------------------------
        */

        this.state.volume =
            volume;

        this.state.isMuted =
            muted;


        /*
        --------------------------------------------
            Synchronize Slider

            View uses a 0-100 range.
        --------------------------------------------
        */

        if (volumeSlider) {

            volumeSlider.value =
                String(
                    Math.round(
                        volume * 100
                    )
                );

        }


        /*
        --------------------------------------------
            Synchronize Icon
        --------------------------------------------
        */

        if (volumeButton) {

            if (muted) {

                volumeButton.textContent =
                    "🔇";

                volumeButton.setAttribute(
                    "aria-label",
                    "Unmute"
                );

                volumeButton.setAttribute(
                    "title",
                    "Unmute"
                );

            } else if (volume < 0.5) {

                volumeButton.textContent =
                    "🔉";

                volumeButton.setAttribute(
                    "aria-label",
                    "Mute"
                );

                volumeButton.setAttribute(
                    "title",
                    "Mute"
                );

            } else {

                volumeButton.textContent =
                    "🔊";

                volumeButton.setAttribute(
                    "aria-label",
                    "Mute"
                );

                volumeButton.setAttribute(
                    "title",
                    "Mute"
                );

            }

        }

    }


    /*==============================================
        Toggle Volume
    ==============================================*/

    toggleVolume() {

        this.state.volumeSliderExpanded = !this.state.volumeSliderExpanded;


        this.syncVolumeSliderState();

        this.toggleMute();

    }


    /*==============================================
        Synchronize Volume Slider State
    ==============================================*/

    syncVolumeSliderState() {

        const volumeSlider =
            miniTheatreView
            .getCinematicVolumeSlider();


        if (!volumeSlider) {

            return;

        }


        volumeSlider.classList.toggle(
            "is-expanded",
            this.state.volumeSliderExpanded
        );

    }


    /*==============================================
        Toggle Mute
    ==============================================*/

    toggleMute() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        /*
        --------------------------------------------
            Currently Muted
        --------------------------------------------
        */

        if (video.muted) {

            const restoreVolume =
                this.state.previousVolume > 0 ?
                this.state.previousVolume :
                1;


            video.muted =
                false;

            video.volume =
                restoreVolume;


            this.state.volume =
                restoreVolume;

            this.state.isMuted =
                false;


            this.syncVolumeControls();

            return;

        }


        /*
        --------------------------------------------
            Mute
        --------------------------------------------
        */

        if (video.volume > 0) {

            this.state.previousVolume =
                video.volume;

        }


        video.muted =
            true;


        this.state.isMuted =
            true;


        this.syncVolumeControls();

    }


    /*==============================================
        Set Volume
    ==============================================*/

    setVolume(volume) {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        if (!Number.isFinite(volume)) {

            return;

        }


        /*
        View sends volume as 0-100.
        Convert to media volume 0-1.
        */

        const normalizedVolume =
            volume > 1 ?
            volume / 100 :
            volume;


        const value =
            Math.max(
                0,
                Math.min(
                    1,
                    normalizedVolume
                )
            );


        /*
        --------------------------------------------
            Volume > 0
        --------------------------------------------
        */

        if (value > 0) {

            this.state.previousVolume =
                value;


            video.volume =
                value;


            video.muted =
                false;


            this.state.volume =
                value;


            this.state.isMuted =
                false;

        }


        /*
        --------------------------------------------
            Volume = 0
        --------------------------------------------
        */
        else {

            if (video.volume > 0) {

                this.state.previousVolume =
                    video.volume;

            }


            video.volume =
                0;


            video.muted =
                true;


            this.state.volume =
                0;


            this.state.isMuted =
                true;

        }


        this.syncVolumeControls();

    }


    /*==============================================
        Toggle Volume Slider
    ==============================================*/

    toggleVolumeSlider() {

        this.state.volumeSliderExpanded = !this.state.volumeSliderExpanded;


        this.syncVolumeSliderState();

    }


    /*==============================================
        Enter Picture-in-Picture
    ==============================================*/

    async enterPictureInPicture() {

        const video =
            miniTheatreView.getVideo();


        if (!video ||
            !document.pictureInPictureEnabled
        ) {

            return false;

        }


        if (
            video.readyState ===
            HTMLMediaElement.HAVE_NOTHING
        ) {

            return false;

        }


        try {

            await video.requestPictureInPicture();

            return true;

        } catch (error) {

            console.error(
                "Picture-in-Picture failed:",
                error
            );

            return false;

        }

    }


    /*==============================================
        Exit Picture-in-Picture
    ==============================================*/

    async exitPictureInPicture() {

        if (!document.pictureInPictureElement) {

            return;

        }


        try {

            await document.exitPictureInPicture();

        } catch (error) {

            console.error(
                "Exit Picture-in-Picture failed:",
                error
            );

        }

    }


    /*==============================================
        Toggle Picture-in-Picture
    ==============================================*/

    async togglePictureInPicture() {

        if (!document.pictureInPictureEnabled) {

            console.warn(
                "Picture-in-Picture is not supported."
            );

            return;

        }


        if (
            document.pictureInPictureElement
        ) {

            await this.exitPictureInPicture();

            return;

        }


        await this.enterPictureInPicture();

    }


    /*==============================================
        Enable Native Automatic PiP
    ==============================================*/

    enableNativeAutomaticPictureInPicture() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        if (
            "autoPictureInPicture" in
            video
        ) {

            try {

                video.autoPictureInPicture =
                    this.state.autoPiPEnabled;

            } catch (error) {

                console.warn(
                    "Mini Theatre: Unable to enable native automatic PiP.",
                    error
                );

            }

        }

    }


    /*==============================================
        Enter Automatic Picture-in-Picture
    ==============================================*/

    async enterAutomaticPictureInPicture() {

        const video =
            miniTheatreView.getVideo();


        if (!video ||
            !document.pictureInPictureEnabled ||
            !this.state.autoPiPEnabled
        ) {

            return false;

        }


        /*
        Only enter PiP while the video
        is actually playing.
        */

        if (
            video.paused ||
            video.ended
        ) {

            return false;

        }


        /*
        Already in PiP.
        */

        if (
            document.pictureInPictureElement ===
            video
        ) {

            return true;

        }


        try {

            await video.requestPictureInPicture();

            return true;

        } catch (error) {

            console.warn(
                "Automatic Picture-in-Picture was not available:",
                error
            );

            return false;

        }

    }


    /*==============================================
        Exit Automatic Picture-in-Picture
    ==============================================*/

    async exitAutomaticPictureInPicture() {

        if (!document.pictureInPictureElement) {

            return;

        }


        try {

            await document.exitPictureInPicture();

        } catch (error) {

            console.warn(
                "Automatic Picture-in-Picture exit failed:",
                error
            );

        }

    }


    /*==============================================
        Bind Fullscreen State
    ==============================================*/

    bindFullscreenState() {

        if (this.fullscreenStateBound) {

            return;

        }


        this.fullscreenStateBound =
            true;


        document.addEventListener(
            "fullscreenchange",
            () => {

                const active =
                    Boolean(
                        document.fullscreenElement
                    );


                this.state.isFullscreen =
                    active;


                const screen =
                    miniTheatreView.getScreen();


                if (screen) {

                    screen.classList.toggle(
                        "is-fullscreen",
                        active
                    );

                }


                miniTheatreView
                    .setFullscreenState(
                        active
                    );


                if (active) {

                    /*
                    --------------------------------
                        Fullscreen UI
                    --------------------------------
                    */

                    this.clearOverlayTimer();

                    this.hideOverlay();

                    this.showCinematicControls();

                } else {

                    /*
                    --------------------------------
                        Restore normal UI
                    --------------------------------
                    */

                    this.enterCinematicActive();

                }

            }
        );

    }


    /*==============================================
        Handle Document Visibility
    ==============================================*/

    handleDocumentVisibility() {

        if (!this.state.autoPiPEnabled) {

            return;

        }


        if (document.hidden) {

            this.enterAutomaticPictureInPicture();

            return;

        }


        /*
        Do not forcibly exit PiP simply because
        the document became visible again.

        Browser/user PiP state should remain authoritative.
        */

    }


    /*==============================================
        Handle Theatre Visibility
    ==============================================*/

    handleTheatreVisibility(isVisible) {

        this.state.theatreVisible =
            isVisible;


        if (!isVisible) {

            this.enterAutomaticPictureInPicture();

            return;

        }

    }


    /*==============================================
        Bind Picture-in-Picture Events
    ==============================================*/

    bindPictureInPictureEvents() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        video.onenterpictureinpicture =
            () => {

                this.state.isPictureInPicture =
                    true;


                miniTheatreView
                    .setPictureInPictureState(
                        true
                    );

            };


        video.onleavepictureinpicture =
            () => {

                this.state.isPictureInPicture =
                    false;


                miniTheatreView
                    .setPictureInPictureState(
                        false
                    );

            };


        this.pictureInPictureBound =
            true;


        this.enableNativeAutomaticPictureInPicture();

    }


    /*==============================================
        Bind Cinematic Playback Controls
    ==============================================*/

    bindCinematicControls() {

        miniTheatreView
            .bindCinematicPlaybackControls({

                onPlay: async() => {

                    if (
                        miniTheatrePlaybackController
                        .state
                        .isPaused
                    ) {

                        await miniTheatrePlaybackController
                            .resumePlayback();

                    } else {

                        await miniTheatrePlaybackController
                            .startPlayback();

                    }


                    this.showCinematicControls();

                    this.resetCinematicHideTimer();

                },


                onPause: () => {

                    miniTheatrePlaybackController
                        .pausePlayback();


                    this.showCinematicControls();

                }

            });

    }


    /*==============================================
        Bind Cinematic Playback Synchronization
    ==============================================*/

    bindCinematicPlaybackSynchronization() {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        video.onplay =
            () => {

                this.syncCinematicPlaybackControls();

                this.showCinematicControls();

                this.resetCinematicHideTimer();

            };


        video.onpause =
            () => {

                this.syncCinematicPlaybackControls();

                this.enterCinematicPaused();

            };


        video.onended =
            () => {

                this.syncCinematicPlaybackControls();

                this.enterCinematicIdle();

            };


        this.syncCinematicPlaybackControls();

    }


    /*==============================================
        Bind Automatic Picture-in-Picture
    ==============================================*/

    bindAutomaticPictureInPicture() {

        /*
        --------------------------------------------
            Visibility listener
        --------------------------------------------
        */

        if (!this.autoPiPVisibilityBound) {

            document.addEventListener(
                "visibilitychange",
                () => {

                    this.handleDocumentVisibility();

                }
            );


            this.autoPiPVisibilityBound =
                true;

        }


        /*
        --------------------------------------------
            Current screen
        --------------------------------------------
        */

        const screen =
            miniTheatreView.getScreen();


        if (!screen) {

            return;

        }


        /*
        Disconnect previous observer.
        */

        if (this.autoPiPObserver) {

            this.autoPiPObserver.disconnect();

            this.autoPiPObserver =
                null;

        }


        /*
        Create observer for current theatre.
        */

        if (
            typeof IntersectionObserver !==
            "function"
        ) {

            return;

        }


        this.autoPiPObserver =
            new IntersectionObserver(

                entries => {

                    const entry =
                        entries[0];


                    if (!entry) {

                        return;

                    }


                    this.handleTheatreVisibility(
                        entry.isIntersecting
                    );

                },

                {
                    threshold: 0.25
                }

            );


        this.autoPiPObserver.observe(
            screen
        );


        /*
        Native browser automatic PiP.
        */

        this.enableNativeAutomaticPictureInPicture();

    }


    /*==============================================
        Bind Cinematic Settings
    ==============================================*/

    bindCinematicSettings() {

        miniTheatreView
            .bindCinematicSettings({

                onSpeedChange: rate => {

                    this.setPlaybackRate(
                        rate
                    );

                },

                onQualityChange: quality => {

                    this.setQuality(
                        quality
                    );

                }

            });

    }


    /*==============================================
        Set Playback Rate
    ==============================================*/

    setPlaybackRate(rate) {

        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        if (!Number.isFinite(rate)) {

            return;

        }


        if (!MINI_THEATRE_PLAYBACK_SPEEDS
            .includes(rate)
        ) {

            return;

        }


        video.playbackRate =
            rate;


        this.state.playbackRate =
            rate;


        miniTheatreView
            .setActivePlaybackRate(
                rate
            );

    }


    /*==============================================
        Sync Cinematic Playback Controls
    ==============================================*/

    syncCinematicPlaybackControls() {

        const video =
            miniTheatreView.getVideo();


        const play =
            miniTheatreView.getCinematicPlay();


        const pause =
            miniTheatreView.getCinematicPause();


        if (!play || !pause) {

            return;

        }


        if (!video) {

            play.hidden =
                false;

            pause.hidden =
                true;

            return;

        }


        if (!video.paused &&
            !video.ended
        ) {

            play.hidden =
                true;

            pause.hidden =
                false;

            return;

        }


        play.hidden =
            false;

        pause.hidden =
            true;

    }


    /*==============================================
        Set Quality
    ==============================================*/

    setQuality(quality) {

        if (
            typeof quality !==
            "string"
        ) {

            return;

        }


        const video =
            miniTheatreView.getVideo();


        if (!video) {

            return;

        }


        /*
        --------------------------------------------
            Current source capability
        --------------------------------------------

        The current movie uses one video source.
        There are currently no alternate quality
        streams to switch between.
        --------------------------------------------
        */

        if (quality !== "auto") {

            console.warn(
                `Quality "${quality}" is not available for this video source.`
            );

            return;

        }


        this.state.quality =
            "auto";


        miniTheatreView
            .setActiveQuality(
                "auto"
            );

    }


    /*==============================================
        Enter Fullscreen
    ==============================================*/

    async enterFullscreen() {

        const screen =
            miniTheatreView.getScreen();


        if (!screen) {

            return;

        }


        if (
            document.fullscreenElement
        ) {

            return;

        }


        if (
            typeof screen.requestFullscreen !==
            "function"
        ) {

            console.warn(
                "Mini Theatre: Fullscreen is not supported."
            );

            return;

        }


        try {

            await screen.requestFullscreen();

        } catch (error) {

            console.error(
                "Fullscreen failed:",
                error
            );

        }

    }


    /*==============================================
        Exit Fullscreen
    ==============================================*/

    async exitFullscreen() {

        if (!document.fullscreenElement) {

            return;

        }


        try {

            await document.exitFullscreen();

        } catch (error) {

            console.error(
                "Exit Fullscreen failed:",
                error
            );

        }

    }


    /*==============================================
        Toggle Fullscreen
    ==============================================*/

    async toggleFullscreen() {

        if (
            document.fullscreenElement
        ) {

            await this.exitFullscreen();

            return;

        }


        await this.enterFullscreen();

    }


    /*==============================================
        Toggle Settings
    ==============================================*/

    toggleSettings() {

        this.state.settingsOpen = !this.state.settingsOpen;


        miniTheatreView
            .setSettingsPanelState(
                this.state.settingsOpen
            );

    }


    /*==============================================
        Close Settings
    ==============================================*/

    closeSettings() {

        this.state.settingsOpen =
            false;


        miniTheatreView
            .setSettingsPanelState(
                false
            );

    }


    /*==============================================
        Show Cinematic Controls
    ==============================================*/

    showCinematicControls() {

        const screen =
            miniTheatreView.getScreen();


        if (!screen) {

            return;

        }


        screen.classList.add(
            "cinematic-controls-visible"
        );


        this.cinematicControlsVisible =
            true;


        /*
        Do not start a hide timer while
        fullscreen is active.
        */

        if (!this.state.isFullscreen) {

            this.resetCinematicHideTimer();

        }

    }


    /*==============================================
        Hide Cinematic Controls
    ==============================================*/

    hideCinematicControls() {

        const screen =
            miniTheatreView.getScreen();


        if (!screen) {

            return;

        }


        /*
        Controls remain visible when paused.
        */

        if (
            miniTheatrePlaybackController
            .state
            .isPaused
        ) {

            return;

        }


        /*
        Controls remain visible in fullscreen.
        */

        if (this.state.isFullscreen) {

            return;

        }


        screen.classList.remove(
            "cinematic-controls-visible"
        );


        this.cinematicControlsVisible =
            false;

    }


    /*==============================================
        Reset Cinematic Hide Timer
    ==============================================*/

    resetCinematicHideTimer() {

        this.clearCinematicHideTimer();


        if (
            this.state.isFullscreen
        ) {

            return;

        }


        if (!miniTheatrePlaybackController
            .state
            .isPlaying
        ) {

            return;

        }


        this.cinematicHideTimer =
            setTimeout(

                () => {

                    this.hideCinematicControls();

                },

                3000

            );

    }


    /*==============================================
        Clear Cinematic Hide Timer
    ==============================================*/

    clearCinematicHideTimer() {

        if (!this.cinematicHideTimer) {

            return;

        }


        clearTimeout(
            this.cinematicHideTimer
        );


        this.cinematicHideTimer =
            null;

    }

}


/*==================================================
    Export Singleton
==================================================*/

export const miniTheatreUIController =
    new MiniTheatreUIController();