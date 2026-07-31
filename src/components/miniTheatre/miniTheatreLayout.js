/*==================================================
    Mini Theatre Layout

    Responsibility:
    Returns the HTML structure for the
    StreamFlix Mini Theatre component.

==================================================*

export function miniTheatreLayout() {

    return `

<section class="mini-theatre__preview">

    <div class="mini-theatre__media">

        <!-- Poster -->

        <img
            class="mini-theatre__poster"
            src=""
            alt=""
        >

        <!-- Highlight Video -->

        <video
            class="mini-theatre__highlight"
            muted
            loop
            playsinline
            preload="metadata"
        ></video>

        <!-- Overlay -->

        <div class="mini-theatre__overlay"></div>

        <!-- Play Button -->

        <button
            class="mini-theatre__play"
            type="button"
            aria-label="Play Movie"
        >

            <i data-lucide="play"></i>

        </button>

    </div>

</section>
`;

}

*/

"use strict";

/*==================================================
    MiniTheatre Layout
==================================================*/

export const miniTheatreLayout = Object.freeze({

    theatre: {

        root: ".mini-theatre",

        screen: ".mini-theatre__screen",

        overlay: ".mini-theatre__overlay",

        media: ".mini-theatre__media",

        poster: ".mini-theatre__poster",

        video: ".mini-theatre__video"

    },

    metadata: {

        container: ".mini-theatre__metadata",

        logo: ".mini-theatre__logo",

        title: ".mini-theatre__title",

        year: ".mini-theatre__year",

        rating: ".mini-theatre__rating",

        duration: ".mini-theatre__duration",

        genres: ".mini-theatre__genres",

        description: ".mini-theatre__description"

    },

    controls: {

        container: ".mini-theatre__controls",

        play: ".mini-theatre__play",

        resume: ".mini-theatre__resume",

        remove: ".mini-theatre__remove"

    },

    playlist: {

        root: ".mini-theatre__playlist",

        header: ".playlist__header",

        title: ".playlist__title",

        counter: ".playlist__counter",

        track: ".playlist__track",

        footer: ".playlist__footer"

    }

});