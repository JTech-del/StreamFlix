"use strict";

/*==================================================
    StreamFlix

    Playlist Layout

    File:
    src/components/miniTheatre/playlist/playlistLayout.js

    Responsibility:

    Returns the HTML structure for the
    Mini Theatre Playlist.

==================================================*/

export function playlistLayout() {

    return `

        <section
            class="playlist"
            aria-label="Continue Watching"
        >

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
                    data-action="clear"
                    aria-label="Clear Playlist"
                >

                    Clear

                </button>

            </header>


            <div class="playlist__viewport">

                <div class="playlist__track">

                    <!-- Playlist cards render here -->

                </div>

            </div>

        </section>

    `;

}


/*
Compatibility alias.

Some older imports use playListLayout()
with a capital L in "List".
*/

export const playListLayout =
    playlistLayout;