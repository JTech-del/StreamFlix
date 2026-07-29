"use strict";

/*==================================================
    StreamFlix

    Playlist Layout

    File:
    src/components/miniTheatre/playList/playListLayout.js

    Responsibility:

    Returns the HTML structure for the
    Mini Theatre Playlist.

==================================================*/

export function playListLayout() {

    return `

<section
    class="playlist"
    aria-label="Continue Watching">

    <header class="playlist__header">

        <div class="playlist__heading">

            <h2 class="playlist__title">

                Continue Watching

            </h2>

            <p class="playlist__subtitle">

                Resume your favourite movies

            </p>

        </div>

        <button
            class="playlist__clear"
            type="button"
            aria-label="Clear Playlist">

            Clear

        </button>

    </header>

    <div class="playlist__viewport">

        <div class="playlist__track">

            <!-- Playlist Cards Render Here -->

        </div>

    </div>

</section>

`;

}

function playlistLayout() {

    return `...`;

}

export { playlistLayout };