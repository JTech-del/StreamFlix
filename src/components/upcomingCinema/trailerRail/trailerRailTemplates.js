"use strict";

function escapeAttribute(value) {
    return String(value ?? "").replace(/[&\"<>']/g, (character) => ({
        "&": "&amp;",
        "\"": "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;"
    })[character]);
}

function trailerPreviewMarkup(movie, trailerUrl, title) {
    try {
        const url = new URL(trailerUrl);
        if (
            url.origin === "https://www.youtube-nocookie.com" &&
            /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
        ) {
            const embedUrl = new URL(url.pathname, url.origin);
            embedUrl.searchParams.set("autoplay", "1");
            embedUrl.searchParams.set("mute", "1");
            embedUrl.searchParams.set("playsinline", "1");
            embedUrl.searchParams.set("controls", "0");
            embedUrl.searchParams.set("loop", "1");
            embedUrl.searchParams.set("playlist", url.pathname.slice("/embed/".length));
            return `<iframe class="trailer-rail__video trailer-rail__video--embed" src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(title)} trailer preview" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        }

        if (!["http:", "https:"].includes(url.protocol)) return "";
        return `<video class="trailer-rail__video" data-trailer-video src="${escapeAttribute(url)}" poster="${escapeAttribute(movie.backdropUrl || movie.posterUrl || movie.backdrop || movie.poster || "")}" muted loop playsinline preload="none" aria-label="${escapeAttribute(title)} trailer preview"></video>`;
    } catch {
        return "";
    }
}


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

            const trailerPreview = trailerPreviewMarkup(
                movie,
                trailerUrl,
                title
            );


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

                 ${trailerPreview}


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
