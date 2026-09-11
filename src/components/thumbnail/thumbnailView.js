"use strict";

/*==================================================
    Thumbnail View

    Responsibility:

    Handles all DOM rendering for the
    StreamFlix Thumbnail component.

    Does NOT handle:

    ✗ MediaRail state
    ✗ MediaRail navigation
    ✗ Theatre playback
    ✗ Download logic
    ✗ My List state

==================================================*/

import {
    thumbnailLayout
} from "./thumbnailLayout.js";


class ThumbnailView {

    constructor() {

        this.container = null;

        this.elements = {};

        this.activeMovie = null;

        this.downloadButtons = [];

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (!container) {

            console.error(
                "Thumbnail container not found."
            );

            return;

        }


        this.container = container;

    }


    /*==============================================
        Render
    ==============================================*/

    render() {

        if (!this.container) {

            console.error(
                "Thumbnail container not found."
            );

            return;

        }


        this.container.innerHTML =
            thumbnailLayout();


        this.cacheElements();

    }


    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        if (!this.container) {

            return;

        }


        this.elements = {

            section:

                this.container.querySelector(
                ".thumbnail"
            ),


            track:

                this.container.querySelector(
                ".thumbnail__track"
            ),


            previousButton:

                this.container.querySelector(
                ".thumbnail__button--prev"
            ),


            nextButton:

                this.container.querySelector(
                ".thumbnail__button--next"
            )



        };

        this.downloadButtons =
            Array.from(
                this.container.querySelectorAll(
                    '[data-action="download"]'
                )
            );
    }


    /*==============================================
        Render Movies
    ==============================================*/

    renderMovies(movies = []) {

        if (!this.elements.track) {

            return;

        }


        this.elements.track.innerHTML =

            movies.map(

                (movie, index) => `

                <article

                    class="thumbnail__card"

                    data-slug="${movie.slug}"

                    data-index="${index}"

                    data-id="${movie.id}"

                    tabindex="0"

                    role="button"

                    aria-label="${movie.title}"

                >


                    <!--==================================
                        Poster Wrapper
                    ==================================-->

                    <div class="thumbnail__image-wrapper">


                        <img

                            class="thumbnail__image"

                            src="${movie.poster || ""}"

                            alt="${movie.title}"

                            loading="lazy"

                        >


                        <!--==================================
                            Rating — TOP RIGHT
                        ==================================-->

                        <div

                            class="thumbnail__rating"

                            aria-label="Rating ${movie.rating ?? "N/A"}"

                        >

                            <i

                                data-lucide="star"

                                aria-hidden="true"

                            ></i>


                            <span>

                                ${movie.rating ?? "N/A"}

                            </span>

                        </div>


                        <!--==================================
                            Dark Overlay
                        ==================================-->

                        <div

                            class="thumbnail__overlay"

                        ></div>


                        <!--==================================
                            Theatre Button — CENTER
                        ==================================-->

                        <button

                            class="thumbnail__play"

                            type="button"

                            data-action="theatre"

                            data-movie-id="${movie.id}"

                            aria-label="Watch ${movie.title} in Theatre"

                            title="Watch in Theatre"

                        >

                            <i

                                data-lucide="tv"

                                aria-hidden="true"

                            ></i>

                        </button>


                    </div>


                    <!--==================================
                        Movie Information
                    ==================================-->

                    <div

                        class="thumbnail__content"

                    >


                        <h3

                            class="thumbnail__title"

                        >

                            ${movie.title}

                        </h3>


                        <!--==================================
                            Movie Metadata
                        ==================================-->

                        <div

                            class="thumbnail__meta"

                        >

                            <span>

                                ${movie.year || ""}

                            </span>

                            <span aria-hidden="true">

                                •

                            </span>

                            <span>

                                ${movie.duration || ""}

                            </span>

                            <span aria-hidden="true">

                                •

                            </span>

                            <span>

                                HD

                            </span>

                        </div>


                        <!--==================================
                            Card Actions
                        ==================================-->

                        <div

                            class="thumbnail__actions"

                            aria-label="${movie.title} actions"

                        >


                            <!-- Thumbs Up -->

                            <button

                                type="button"

                                class="thumbnail__action
                                       thumbnail__action--thumb-up"

                                data-action="thumb-up"

                                data-movie-id="${movie.id}"

                                aria-label="Like ${movie.title}"

                                title="Like"

                            >

                                <i

                                    data-lucide="thumbs-up"

                                    aria-hidden="true"

                                ></i>

                            </button>


                            <!-- Thumbs Down -->

                            <button

                                type="button"

                                class="thumbnail__action
                                       thumbnail__action--thumb-down"

                                data-action="thumb-down"

                                data-movie-id="${movie.id}"

                                aria-label="Dislike ${movie.title}"

                                title="Dislike"

                            >

                                <i

                                    data-lucide="thumbs-down"

                                    aria-hidden="true"

                                ></i>

                            </button>


                           <!-- My List -->

<button
    type="button"
    class="thumbnail__action
           thumbnail__action--my-list"
    data-action="my-list"
    data-movie-id="${movie.id}"
    aria-label="Add ${movie.title} to My List"
    title="Add to My List"
>
    <i
        data-lucide="plus"
        aria-hidden="true"
    ></i>

    <span>
        My List
    </span>
</button>

<!-- Download -->

<button
    type="button"
    class="thumbnail__action
           thumbnail__action--download"
    data-action="download"
    data-movie-id="${movie.id}"
    aria-label="Download ${movie.title}"
    title="Download"
>

    <i
        data-lucide="download"
        aria-hidden="true"
    ></i>

</button>

                        </div>


                    </div>


                </article>

            `

            ).join("");


        /*==============================================
            Refresh Lucide Icons
        ==============================================*/

        if (

            typeof window !== "undefined" &&

            window.lucide &&

            typeof window.lucide.createIcons ===
            "function"

        ) {

            window.lucide.createIcons();

        }


        /*==============================================
            Featured Movie
        ==============================================*/

        const featured = movies.find(

            movie => movie.featured

        );


        if (featured) {

            this.setActiveMovie(

                featured.slug

            );

        }

    }


    /*==============================================
        Set Active Movie
    ==============================================*/

    setActiveMovie(slug) {

        if (!this.container) {

            return;

        }


        this.clearActive();


        const card =

            this.container.querySelector(

                `.thumbnail__card[data-slug="${slug}"]`

            );


        if (!card) {

            return;

        }


        card.classList.add(

            "is-active"

        );


        this.activeMovie = card;


        this.scrollToMovie(slug);

    }


    /*==============================================
        Clear Active Movie
    ==============================================*/

    clearActive() {

        if (this.activeMovie) {

            this.activeMovie.classList.remove(

                "is-active"

            );

        }


        if (!this.container) {

            this.activeMovie = null;

            return;

        }


        this.container

            .querySelectorAll(

            ".thumbnail__card.is-active"

        )

        .forEach(

            card => {

                card.classList.remove(
                    "is-active"
                );

            }

        );


        this.activeMovie = null;

    }


    /*==============================================
        Scroll To Movie
    ==============================================*/

    scrollToMovie(slug) {

        if (!this.container) {

            return;

        }


        const card =

            this.container.querySelector(

                `.thumbnail__card[data-slug="${slug}"]`

            );


        if (!card) {

            return;

        }


        card.scrollIntoView({

            behavior: "smooth",

            inline: "center",

            block: "nearest"

        });

    }


    /*==============================================
        Focus Movie
    ==============================================*/

    focusMovie(slug) {

        if (!this.container) {

            return;

        }


        const card =

            this.container.querySelector(

                `.thumbnail__card[data-slug="${slug}"]`

            );


        if (!card) {

            return;

        }


        card.focus({

            preventScroll: true

        });

    }


    /*==============================================
        Disable Interaction
    ==============================================*/

    disableInteraction() {

        if (!this.elements.track) {

            return;

        }


        this.elements.track.classList.add(

            "is-disabled"

        );

    }


    /*==============================================
        Enable Interaction
    ==============================================*/

    enableInteraction() {

        if (!this.elements.track) {

            return;

        }


        this.elements.track.classList.remove(

            "is-disabled"

        );

    }


    /*==============================================
        Clear
    ==============================================*/

    clear() {

        if (!this.elements.track) {

            return;

        }


        this.elements.track.innerHTML = "";

        this.activeMovie = null;

    }


    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        if (!this.container) {

            return;

        }


        this.container.innerHTML = "";

        this.container = null;

        this.elements = {};

        this.activeMovie = null;

    }

}


/*==================================================
    Public Thumbnail View
==================================================*/

export const thumbnailView =

    new ThumbnailView();