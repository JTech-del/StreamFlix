"use strict";

/*==================================================
    Thumbnail View

    Responsibility:
    Handles all DOM rendering for the
    StreamFlix Thumbnail component.

==================================================*/

import { thumbnailLayout } from "./thumbnailLayout.js";

import { mediaRailView } from "../mediaRail/mediaRailView.js";


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

        mediaRailView.init(this.elements.track);

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
    tabindex="0"
    role="button"
    aria-label="${movie.title}">

    <img
        class="thumbnail__image"
        src="${movie.poster}"
        alt="${movie.title}"
        loading="lazy">

    <!-- Dark Overlay -->
    <div class="thumbnail__overlay"></div>

    <!-- Play Button -->
    <button
        class="thumbnail__play"
        type="button"
        aria-label="Play ${movie.title}">
        <i data-lucide="play"></i>
    </button>

    <!-- Movie Info -->
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
        /* FOR OVELAY Effect */
        if (

            window.lucide &&
            typeof window.lucide.createIcons === "function"

        ) {

            window.lucide.createIcons();

        }


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

        mediaRailView.setActiveItem(

            ".thumbnail__card",

            `.thumbnail__card[data-slug="${slug}"]`

        );

        this.scrollToMovie(slug);

    }

    /*==============================================
            Set Active Items
        ==============================================*/
    setActiveItem(itemSelector, activeSelector) {

        if (!this.container) {

            return;

        }

        this.clearActive();

        const item = this.container.querySelector(activeSelector);

        if (!item) {

            return;

        }

        item.classList.add("is-active");

        this.activeItem = item;

    }

    /*==============================================
        Scroll To Movie
    ==============================================*

    scrollToMovie(slug) {

        mediaRailView.scrollToItem(

            `.thumbnail__card[data-slug="${slug}"]`

        );

    }


    /** */

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
        Focus Movie
    ==============================================*/

    focusMovie(slug) {

            const card = this.container.querySelector(

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