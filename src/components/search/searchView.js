"use strict";

/*==================================================
    Search View

    Responsibility:
    Handles all DOM rendering for the
    StreamFlix Search component.

==================================================*/

import { searchLayout } from "./searchLayout.js";

class SearchView {

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

                console.error("Search container not found.");

                return;

            }

            this.container.innerHTML = searchLayout();

            this.cacheElements();

        }
        /*==============================================
            Render Results
        ==============================================*/
    renderResults(movies) {

        if (!this.elements.results) {

            return;

        }

        if (!movies.length) {

            this.elements.results.classList.remove("is-open");

            this.elements.results.classList.add("is-open");

            this.elements.results.innerHTML = `

<div class="search__empty">

    <div class="search__empty-icon">

        <i data-lucide="film"></i>

    </div>

    <h3 class="search__empty-title">

        We couldn't find your movie.

    </h3>

    <p class="search__empty-text">

        Try another title, genre or release year.

    </p>

    <div class="search__popular">

        <span class="search__popular-label">

            Popular Searches

        </span>

        <div class="search__popular-list">

            <button class="search__popular-item">

                Interstellar

            </button>

            <button class="search__popular-item">

                John Wick

            </button>

            <button class="search__popular-item">

                Avatar

            </button>

            <button class="search__popular-item">

                The Dark Knight

            </button>

        </div>

    </div>

</div>

`;

            window.lucide.createIcons();
            return;

        }

        this.elements.results.classList.add("is-open");

        this.elements.results.innerHTML = movies.map(movie => `

        <article
            class="search__result"
            data-slug="${movie.slug}"
        >

            <img

                class="search__poster"

                src="${movie.posterUrl || ""}"

                alt="${movie.title}"

                loading="lazy"

            >

            <div class="search__content">

                <h3 class="search__title">

                    ${movie.title}

                </h3>

                <p class="search__genre">

                    ${movie.genres.join(" • ")}

                </p>

                <div class="search__meta">

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

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            section:

                this.container.querySelector(".search"),

            input:

                this.container.querySelector(".search__input"),

            searchButton:

                this.container.querySelector(".search__icon"),

            clearButton:

                this.container.querySelector(".search__clear"),

            results:

                this.container.querySelector(".search__results")

        };

    }

    /*==============================================
        Clear Results
    ==============================================*/

    clearResults() {

        if (!this.elements.results) {

            return;

        }

        this.elements.results.classList.remove("is-open");

        this.elements.results.innerHTML = "";

    }

    /*==============================================
        Show Results
    ==============================================*/

    showResults(html) {

        if (!this.elements.results) {

            return;

        }

        this.elements.results.innerHTML = html;

    }

    /*==============================================
        Clear Input
    ==============================================*/

    clearInput() {

        if (!this.elements.input) {

            return;

        }

        this.elements.input.value = "";

    }

    /*==============================================
    Set Active Movie
==============================================*/
    setActiveMovie(slug) {

            if (!this.elements.results) {

                return;

            }

            const cards = this.elements.results.querySelectorAll(

                ".search__result"

            );

            cards.forEach(card => {

                card.classList.toggle(

                    "is-active",

                    card.dataset.slug === slug

                );

            });

        }
        /*==============================================
    Open Search
==============================================*/

    open() {

        if (!this.elements.section) {

            return;

        }

        this.elements.section.classList.add("is-open");

    }

    /*==============================================
        Close Search
    ==============================================*/

    close() {

        if (!this.elements.section) {

            return;

        }

        this.elements.section.classList.remove("is-open");

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

export const searchView = new SearchView();