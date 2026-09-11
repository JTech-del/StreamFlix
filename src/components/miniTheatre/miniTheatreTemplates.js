"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Templates

    Responsibility

    ✓ Theatre Screen
    ✓ Playlist Card
    ✓ Empty State
    ✓ Cinematic Controls
    ✓ Settings Structure
    ✓ Progress Structure
    ✓ Accessibility Hooks

==================================================*/



export const miniTheatreTemplates = {

    /*==============================================
        Mini Theatre Layout
    ==============================================*/

    layout() {

        return `

        <section class="mini-theatre">

            <!--==================================
                Screen
            ===================================-->

            <section

                class="mini-theatre__screen"

            >

            </section>


            <!--==================================
                Sidebar
            ===================================-->

            <aside

                class="mini-theatre__sidebar"

            >

                <!--==============================
                    Header
                ==============================-->

                <header

                    class="mini-theatre__header"

                >

                    <h2>

                        My Playlist

                    </h2>


                    <span

                        class="mini-theatre__counter"

                    >

                        0

                    </span>

                </header>


                <!--==============================
                    Playlist
                ==============================-->

                <div

                    class="mini-theatre__playlist"

                >

                </div>

            </aside>

        </section>

    `;

    },


    /*==============================================
        Empty State
    ==============================================*/

    emptyState() {

        return `

            <div class="mini-theatre__empty">

                <div class="mini-theatre__empty-icon">

                    🎬

                </div>


                <h2 class="mini-theatre__empty-title">

                    Your playlist is empty

                </h2>


                <p class="mini-theatre__empty-text">

                    Select a movie from the Media Rail
                    to begin watching.

                </p>

            </div>

        `;

    },


    /*==============================================
        Movie
    ==============================================*/

    movie(movie) {

        return `

        <!--==================================
            Media
        ===================================-->

        <div class="mini-theatre__media">

            <!--==============================
                Poster
            ==============================-->

            <img

                class="mini-theatre__poster"

                src="${movie.poster}"

                alt="${movie.title}"

                loading="lazy"

            >


            <!--==============================
                Video
            ==============================-->

            <video

                class="mini-theatre__video"

                hidden

                playsinline

                preload="metadata"

            >

                <source

               src="${movie.streamUrl || ""}"

                    type="video/mp4"

                >

            </video>

        </div>


        <!--==================================
            Content Overlay
        ==================================-->

        <div class="mini-theatre__content">

            <!--==============================
                Movie Title
            ==============================-->

            <h2 class="mini-theatre__title">

                ${movie.title}

            </h2>


            <!--==============================
                Metadata
            ==============================-->

            <div class="mini-theatre__metadata">

                <span>

                ${movie.year || ""}
                </span>

                <span>•</span>

                <span>

                    ${movie.runtime || ""}

                </span>

                <span>•</span>

                <span>

                    ${movie.rating || ""}

                </span>

            </div>


            <!--==============================
                Description
            ==============================-->

            <p class="mini-theatre__overview">

                ${movie.description ||
                movie.overview ||
                ""}

            </p>


            <!--==============================
                Existing Theatre Controls
            ==============================-->

            <div class="mini-theatre__controls">

                <button

                    class="mini-theatre__play"

                    data-action="play"

                >

                    ▶ Play

                </button>


                <button

                    class="mini-theatre__resume"

                    data-action="resume"

                    hidden

                >

                    ▶ Resume

                </button>


                <button

                    class="mini-theatre__remove"

                    data-action="remove"

                >

                    🗑 Remove

                </button>

            </div>

        </div>


        <!--==================================
            Cinematic Controls
        ==================================-->

        <div class="mini-theatre__cinematic-controls">


            <!--==============================
                Skip Backward
            ==============================-->

            <button

                class="mini-theatre__control
                       mini-theatre__control--skip-backward"

                data-cinematic-action="skip-backward"

                aria-label="Skip backward 10 seconds"

                title="Skip backward 10 seconds"

            >

                ↶10

            </button>


            <!--==============================
                Playback
            ==============================-->

            <button

                class="mini-theatre__control
                       mini-theatre__control--play"

                data-cinematic-action="play"

                aria-label="Play"

                title="Play"

            >

                ▶

            </button>


            <button

                class="mini-theatre__control
                       mini-theatre__control--pause"

                data-cinematic-action="pause"

                aria-label="Pause"

                title="Pause"

                hidden

            >

                ❚❚

            </button>


            <!--==============================
                Skip Forward
            ==============================-->

            <button

                class="mini-theatre__control
                       mini-theatre__control--skip-forward"

                data-cinematic-action="skip-forward"

                aria-label="Skip forward 10 seconds"

                title="Skip forward 10 seconds"

            >

                10↷

            </button>


            <!--==============================
                Volume
            ==============================-->

            <button

                class="mini-theatre__control
                       mini-theatre__control--volume"

                data-cinematic-action="mute"

                aria-label="Mute"

                title="Mute"

            >

                🔊

            </button>


            <input

                class="mini-theatre__volume"

                type="range"

                min="0"

                max="1"

                step="0.01"

                value="1"

                aria-label="Volume"

            >


            <!--==============================
                Time
            ==============================-->

            <div class="mini-theatre__time">

                <span

                    class="mini-theatre__current-time"

                >

                    00:00

                </span>


                <span

                    class="mini-theatre__time-separator"

                >

                    /

                </span>


                <span

                    class="mini-theatre__duration"

                >

                    00:00

                </span>

            </div>


            <!--==============================
                Spacer
            ==============================-->

            <div

                class="mini-theatre__controls-spacer"

            ></div>

<!--==================================
    Settings
==================================-->

<div class="mini-theatre__settings">

    <!--==================================
        Settings Button
    ==================================-->

    <button
        type="button"
        class="mini-theatre__control
               mini-theatre__control--settings"
        data-cinematic-action="settings"
        aria-label="Settings"
        title="Settings"
        aria-expanded="false"
        aria-controls="mini-theatre-settings-menu"
    >

        ⚙

    </button>


    <!--==================================
        Settings Menu
    ==================================-->

    <div
        class="mini-theatre__settings-menu"
        id="mini-theatre-settings-menu"
        role="dialog"
        aria-label="Player settings"
        aria-hidden="true"
        hidden
    >

        <!--==================================
            Main Settings
        ==================================-->

        <div
            class="mini-theatre__settings-main"
        >

            <!-- Settings Header -->

            <div class="mini-theatre__settings-header">

                <span>
                    Settings
                </span>


                <button
                    type="button"
                    class="mini-theatre__settings-close"
                    aria-label="Close settings"
                    title="Close settings"
                >

                    ✕

                </button>

            </div>


            <!--==================================
                Playback Speed
            ==================================-->

            <button
                type="button"
                class="mini-theatre__settings-item"
                data-setting="playback-speed"
            >

                <span>
                    Playback speed
                </span>


                <span
                    class="mini-theatre__settings-value"
                    data-setting-value="playback-speed"
                >
                    Normal
                </span>


                <span aria-hidden="true">
                    ›
                </span>

            </button>


            <!--==================================
                Quality
            ==================================-->

            <button
                type="button"
                class="mini-theatre__settings-item"
                data-setting="quality"
            >

                <span>
                    Quality
                </span>


                <span
                    class="mini-theatre__settings-value"
                    data-setting-value="quality"
                >
                    Auto
                </span>


                <span aria-hidden="true">
                    ›
                </span>

            </button>

        </div>


        <!--==================================
            Playback Speed Submenu
        ==================================-->

        <div
            class="mini-theatre__settings-submenu"
            data-settings-panel="playback-speed"
            hidden
        >

            <!-- Header -->

            <div class="mini-theatre__settings-header">

                <button
                    type="button"
                    class="mini-theatre__settings-back"
                    data-settings-back
                    aria-label="Back to settings"
                    title="Back"
                >

                    ←

                </button>


                <span>
                    Playback speed
                </span>

            </div>


            <!--==================================
                Speed Options
            ==================================-->

            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="0.5"
            >
                0.5×
            </button>


            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="0.75"
            >
                0.75×
            </button>


            <button
                type="button"
                class="mini-theatre__settings-option
                       mini-theatre__settings-option--active"
                data-playback-rate="1"
            >

                <span>
                    Normal
                </span>

                <span aria-hidden="true">
                    ✓
                </span>

            </button>


            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="1.25"
            >
                1.25×
            </button>


            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="1.5"
            >
                1.5×
            </button>


            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="1.75"
            >
                1.75×
            </button>


            <button
                type="button"
                class="mini-theatre__settings-option"
                data-playback-rate="2"
            >
                2×
            </button>

        </div>


        <!--==================================
            Quality Submenu
        ==================================-->

        <div
            class="mini-theatre__settings-submenu"
            data-settings-panel="quality"
            hidden
        >

            <!-- Header -->

            <div class="mini-theatre__settings-header">

                <button
                    type="button"
                    class="mini-theatre__settings-back"
                    data-settings-back
                    aria-label="Back to settings"
                    title="Back"
                >

                    ←

                </button>


                <span>
                    Quality
                </span>

            </div>


            <!--==================================
                Quality Option
            ==================================-->

            <button
                type="button"
                class="mini-theatre__settings-option
                       mini-theatre__settings-option--active"
                data-quality="auto"
            >

                <span>
                    Auto
                </span>

                <span aria-hidden="true">
                    ✓
                </span>

            </button>

        </div>

    </div>


    <!--==================================
        End Settings Menu
    ==================================-->

</div>

<!--==================================
    Picture-in-Picture
==================================-->

<button

    class="mini-theatre__control
           mini-theatre__control--pip"

    data-cinematic-action="pip"

    aria-label="Picture-in-Picture"

    title="Picture-in-Picture"

    hidden

>

    ⧉

</button>


<!--==============================
    Fullscreen
==============================-->

<button

    class="mini-theatre__control
           mini-theatre__control--fullscreen"

    data-cinematic-action="fullscreen"

    aria-label="Fullscreen"

    title="Fullscreen"

>

    ⛶

</button>
 

</div> 

        </div>


        <!--==================================
            Cinematic Progress
        ==================================-->

        <div

            class="mini-theatre__cinematic-progress"

            role="slider"

            aria-label="Video progress"

            aria-valuemin="0"

            aria-valuemax="100"

            aria-valuenow="0"

            tabindex="0"

        >

            <!--==============================
                Timeline Preview
            ==============================-->

            <div

                class="mini-theatre__progress-preview"

                aria-hidden="true"

            >

                00:00

            </div>


            <!--==============================
                Buffered Progress
            ==============================-->

            <div

                class="mini-theatre__cinematic-progress-buffer"

            ></div>


            <!--==============================
                Watched Progress
            ==============================-->

            <div

                class="mini-theatre__cinematic-progress-fill"

            ></div>


            <!--==============================
                Timeline Playhead
            ==============================-->

            <div

                class="mini-theatre__progress-playhead"

                aria-hidden="true"

            ></div>

        </div>

    `;

    },

    /*==============================================
        Playlist Card
    ==============================================*/

    playlistCard(movie, index, state = {}) {

        if (!movie) {

            return "";

        }


        const status =
            state.status || "⚪ READY";


        const progress =
            Number.isFinite(state.progress) ?
            Math.max(
                0,
                Math.min(
                    100,
                    state.progress
                )
            ) :
            0;


        const isNextUp =
            state.nextUp === true;


        const isCompleted =
            state.completed === true ||
            progress >= 100 ||
            status === "🔵 COMPLETE";


        /*
        ------------------------------------------
            Card Playback State
        ------------------------------------------
        */

        const play =
            typeof state.play === "boolean" ?
            state.play :
            !isCompleted;


        const pause =
            typeof state.pause === "boolean" ?
            state.pause :
            false;


        const resume =
            typeof state.resume === "boolean" ?
            state.resume :
            false;


        /*
        ------------------------------------------
            Visibility
        ------------------------------------------
        */

        const playHidden = !play || pause || resume || isCompleted;


        const pauseHidden = !pause;


        const resumeHidden = !resume || isCompleted;


        return `

    <article

        class="playlist-card
            ${isNextUp
                ? "playlist-card--next-up"
                : ""
            }
            ${isCompleted
                ? "playlist-card--completed"
                : ""
            }"

        data-index="${index}"

        data-movie-id="${movie.id || ""}"

        data-movie-slug="${movie.slug || ""}"

    >

        <!--==================================
            Poster
        ===================================-->

        <div class="playlist-card__media">

            <img

                class="playlist-card__poster"

                src="${movie.poster || ""}"

                alt="${movie.title || "Movie"}"

                loading="lazy"

            >


            <!--================================
                Next Up Badge
            =================================-->

            <span

                class="playlist-card__next-up"

                ${isNextUp ? "" : "hidden"}

            >

                NEXT UP

            </span>


            <!--================================
                Completed Badge
            =================================-->

            <span

                class="playlist-card__completed"

                ${isCompleted ? "" : "hidden"}

            >

                COMPLETED

            </span>

        </div>


        <!--==================================
            Card Content
        ==================================-->

        <div class="playlist-card__content">

            <h3 class="playlist-card__title">

                ${movie.title || "Untitled"}

            </h3>


            <!--================================
                Status
            =================================-->

            <span

                class="playlist-card__status"

            >

                ${status}

            </span>


            <!--================================
                Progress
            =================================-->

            <div

                class="playlist-card__progress"

                role="progressbar"

                aria-valuemin="0"

                aria-valuemax="100"

                aria-valuenow="${Math.round(progress)}"

                aria-label="Watch progress"

            >

                <div

                    class="playlist-card__progress-fill"

                    style="width: ${progress}%"

                ></div>

            </div>


            <!--================================
                Actions
            =================================-->

            <div class="playlist-card__actions">


                <!-- PLAY -->

                <button

                    class="playlist-card__action
                           playlist-card__action--play"

                    type="button"

                    data-action="play"

                    ${playHidden ? "hidden" : ""}

                >

                    ▶ Play

                </button>


                <!-- PAUSE -->

                <button

                    class="playlist-card__action
                           playlist-card__action--pause"

                    type="button"

                    data-action="pause"

                    ${pauseHidden ? "hidden" : ""}

                >

                    ❚❚ Pause

                </button>


                <!-- RESUME -->

                <button

                    class="playlist-card__action
                           playlist-card__action--resume"

                    type="button"

                    data-action="resume"

                    ${resumeHidden ? "hidden" : ""}

                >

                    ▶ Resume

                </button>


                <!-- REMOVE -->

                <button

                    class="playlist-card__action
                           playlist-card__action--remove"

                    type="button"

                    data-action="remove"

                >

                    🗑 Remove

                </button>

            </div>

        </div>

    </article>

    `;

    },


    /*==============================================
        Loading State
    ==============================================*/

    loadingState() {

        return `

            <div class="mini-theatre__loading">

                <div class="mini-theatre__spinner"></div>

                <p>

                    Preparing your movie...

                </p>

            </div>

        `;

    },


    /*==============================================
        Error State
    ==============================================*/

    errorState(
        message = "Unable to play this movie."
    ) {

        return `

            <div class="mini-theatre__error">

                <div class="mini-theatre__error-icon">

                    ⚠️

                </div>


                <h3>

                    Playback Error

                </h3>


                <p>

                    ${message}

                </p>

            </div>

        `;

    }

};