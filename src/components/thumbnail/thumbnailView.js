"use strict";

/*==================================================
    Thumbnail View

    Responsibility:
    Handles all DOM rendering for the
    StreamFlix Thumbnail component.

==================================================*/

import { thumbnailLayout } from "./thumbnailLayout.js";

class ThumbnailView {

    constructor() {

        this.container = null;

        this.elements = {};

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        this.container = container;

    }

    /*==============================================
        Render
    ==============================================*/

    render() {

        if (!this.container) {

            console.error("Thumbnail container not found.");

            return;

        }

        this.container.innerHTML = thumbnailLayout();

        this.cacheElements();

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            section:

                this.container.querySelector(".thumbnail"),

            track:

                this.container.querySelector(".thumbnail__track"),

            previousButton:

                this.container.querySelector(".thumbnail__button--prev"),

            nextButton:

                this.container.querySelector(".thumbnail__button--next")

        };

    }

    /*==============================================
        Render Movies
    ==============================================*/

    renderMovies(movies) {

        if (!this.elements.track) {

            return;

        }

        this.elements.track.innerHTML = movies.map(movie => `

            <article
                class="thumbnail__card"
                data-slug="${movie.slug}"
            >

                <img
                    class="thumbnail__image"
                    src="${movie.poster}"
                    alt="${movie.title}"
                    loading="lazy"
                >

                <div class="thumbnail__content">

                    <h3 class="thumbnail__title">

                        ${movie.title}

                    </h3>

                    <div class="thumbnail__meta">

                        <span>

                            ⭐ ${movie.rating ?? "N/A"}

                        </span>

                        <span>

                            ${movie.year}

                        </span>

                    </div>

                </div>

            </article>

        `).join("");


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
    Set Active Movie (Center Active Movie)
==============================================*/

    setActiveMovie(slug) {

        const cards = this.container.querySelectorAll(

            ".thumbnail__card"

        );

        cards.forEach(card => {

            card.classList.toggle(

                "is-active",

                card.dataset.slug === slug

            );

        });

        this.scrollToMovie(slug);

    }

    /*==============================================
        Scroll To Movie
    ==============================================*/

    scrollToMovie(slug) {

        const card = this.container.querySelector(

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
        Clear
    ==============================================*/

    clear() {

        if (!this.elements.track) {

            return;

        }

        this.elements.track.innerHTML = "";

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        if (!this.container) {

            return;

        }

        this.container.innerHTML = "";

        this.elements = {};

    }

}

export const thumbnailView = new ThumbnailView();