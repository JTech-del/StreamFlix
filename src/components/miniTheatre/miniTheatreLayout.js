"use strict";

/*==================================================
    Mini Theatre Layout

    Responsibility:
    Returns the HTML structure for the
    StreamFlix Mini Theatre component.

==================================================*/

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