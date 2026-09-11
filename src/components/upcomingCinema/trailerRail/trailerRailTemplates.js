"use strict";


/*==================================================
    StreamFlix

    Trailer Rail Templates

    Responsibility:

    ✓ Render trailer rail structure
    ✓ Render trailer cards
    ✓ Render trailer video thumbnails
    ✓ Render Watch Trailer buttons
    ✓ Render navigation buttons
    ✓ Mark active trailer
    ✓ Provide DOM data attributes

    Does NOT handle:

    ✕ Movie loading
    ✕ Backend requests
    ✕ Video playback control
    ✕ Application state
    ✕ Navigation logic
    ✕ Mini Theatre
    ✕ Events
==================================================*/


export const trailerRailTemplates = {


        /*==================================================
            Rail
        ==================================================*/

        rail(
            movies = [],
            activeMovieId = null
        ) {

            const trailers =
                Array.isArray(movies)

            ?
            movies.filter(
                movie =>
                movie &&
                movie.trailerUrl
            )

            :
            [];


            return `

            <div
                class="trailer-rail"
                data-trailer-rail
                aria-label="Upcoming movie trailers"
            >


                <!--======================================
                    Previous Button
                ======================================-->

                <button
                    type="button"
                    class="trailer-rail__button
                           trailer-rail__button--previous"
                    data-trailer-action="previous"
                    aria-label="Previous trailers"
                >

                    <span aria-hidden="true">
                        ‹
                    </span>

                </button>



                <!--======================================
                    Track
                ======================================-->

                <div
                    class="trailer-rail__track"
                    data-trailer-track
                >

                    ${
                        trailers.length

                            ?

                            trailers
                                .map(
                                    movie =>
                                        this.card(
                                            movie,
                                            String(movie.id) ===
                                            String(activeMovieId)
                                        )
                                )
                                .join("")

                            :

                            this.emptyState()
                    }

                </div>



                <!--======================================
                    Next Button
                ======================================-->

                <button
                    type="button"
                    class="trailer-rail__button
                           trailer-rail__button--next"
                    data-trailer-action="next"
                    aria-label="Next trailers"
                >

                    <span aria-hidden="true">
                        ›
                    </span>

                </button>


            </div>

        `;

        },


        /*==================================================
            Trailer Card
        ==================================================*/

        card(
            movie,
            isActive = false
        ) {

            if (!movie) {

                return "";

            }


            const movieId =
                movie.id != null ?
                movie.id :
                "";


            const title =
                movie.title ||
                "Upcoming movie";


            const trailerUrl =
                movie.trailerUrl ||
                "";


            return `

            <article

                class="
                    trailer-rail__card
                    ${isActive ? "is-active" : ""}
                "

                data-trailer-card

                data-trailer-id="${movieId}"

            >


                <!--==================================
                    Trailer Media
                ==================================-->

                <div
                    class="trailer-rail__media"
                >

                    <video

                        class="trailer-rail__video"

                        data-trailer-video

                        src="${trailerUrl}"

                        muted

                        loop

                        playsinline

                        preload="metadata"

                        aria-label="${title} trailer"

                    ></video>


                    <!--==================================
                        Media Overlay
                    ==================================-->

                    <div
                        class="trailer-rail__overlay"
                        aria-hidden="true"
                    ></div>


                    <!--==================================
                        Play Indicator
                    ==================================-->

                    <span
                        class="trailer-rail__play"
                        aria-hidden="true"
                    >
                        ▶
                    </span>

                </div>



                <!--==================================
                    Trailer Information
                ==================================-->

                <div
                    class="trailer-rail__info"
                >


                    <h3
                        class="trailer-rail__title"
                    >
                        ${title}
                    </h3>


                    ${
                        movie.releaseDate

                            ?

                            `

                                <span
                                    class="trailer-rail__release"
                                >
                                    ${movie.releaseDate}
                                </span>

                            `

                            :

                            ""
                    }



                    <!--==================================
                        Watch Trailer
                    ==================================-->

                    <button

                        type="button"

                        class="trailer-rail__watch"

                        data-trailer-action="watch"

                        data-movie-id="${movieId}"

                        ${
                            trailerUrl
                                ? ""
                                : "disabled"
                        }

                    >

                        <span aria-hidden="true">
                            ▶
                        </span>


                        ${
                            trailerUrl
                                ? "Watch Trailer"
                                : "Trailer Unavailable"
                        }

                    </button>


                </div>


            </article>

        `;

    },


    /*==================================================
        Empty State
    ==================================================*/

    emptyState() {

        return `

            <div
                class="trailer-rail__empty"
                role="status"
            >

                <span>
                    No upcoming trailers available
                </span>

            </div>

        `;

    }

};


/*==================================================
    Default Export
==================================================*/

export default trailerRailTemplates;