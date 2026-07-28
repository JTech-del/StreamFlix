"use strict";

/*==================================================
    Mini Theatre Layout

    Responsibility:
    Returns the HTML structure for the
    StreamFlix Mini Theatre component.

==================================================*/

export function miniTheatreLayout() {

    return `

<section
    class="miniTheatre"
    aria-label="Mini Theatre">

    <!--==========================================
        Header
    ===========================================-->

    <header class="miniTheatre__header">

        <h2 class="miniTheatre__title">

            Playlist

        </h2>

    </header>

    <!--==========================================
        Body
    ===========================================-->

    <div class="miniTheatre__body">

        <!-- Playlist -->

        <aside
            class="miniTheatre__playlist"
            aria-label="Movie Playlist">

            <div class="miniTheatre__playlist-track">

                <!-- Playlist Items -->

            </div>

        </aside>

        <!-- Preview -->

        <section
            class="miniTheatre__preview"
            aria-label="Movie Preview">

            <div class="miniTheatre__preview-media">

                <img
                    class="miniTheatre__poster"
                    src=""
                    alt=""
                    hidden>

                <video
                    class="miniTheatre__video"
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    hidden>

                </video>

            </div>

            <div class="miniTheatre__content">

                <h3 class="miniTheatre__movie-title">

                    Select a Movie

                </h3>

                <p class="miniTheatre__movie-meta">

                    Preview information will appear here.

                </p>

            </div>

        </section>

    </div>

    <!--==========================================
        Footer
    ===========================================-->

    <footer class="miniTheatre__footer">

        <div
            class="miniTheatre__controls"
            aria-label="Playback Controls">

            <!-- Controls Render Here -->

        </div>

        <div
            class="miniTheatre__plugins"
            aria-label="Plugin Host">

            <!-- Plugins Render Here -->

        </div>

    </footer>

</section>

`;

}