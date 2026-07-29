"use strict";

/*==================================================
    StreamFlix

    Playlist View

    File:
    src/components/miniTheatre/playlist/playlistView.js

    Responsibility:

    ✓ Render playlist
    ✓ Render movie cards
    ✓ Update active movie
    ✓ Clear playlist
    ✓ Destroy view

==================================================*/

import { playlistLayout } from "./playlistLayout.js";

class PlaylistView {

    constructor() {

        this.container = null;

        this.elements = {};

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (!container) {

            console.error(

                "Playlist container not found."

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

            return;

        }

        this.container.innerHTML =

            playlistLayout();

        this.cacheElements();

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            section:

                this.container.querySelector(

                ".playlist"

            ),

            track:

                this.container.querySelector(

                ".playlist__track"

            ),

            clearButton:

                this.container.querySelector(

                ".playlist__clear"

            )

        };

    }

    /*==============================================
        Render Movies
    ==============================================*/

    renderMovies(movies = []) {

        if (!this.elements.track) {

            return;

        }

        this.elements.track.innerHTML =

            movies.map(movie => `

<article
    class="playlist__card"
    data-slug="${movie.slug}"
    tabindex="0"
    role="button">

    <img
        class="playlist__poster"
        src="${movie.poster}"
        alt="${movie.title}"
        loading="lazy">

    <div class="playlist__details">

        <h3 class="playlist__movie-title">

            ${movie.title}

        </h3>

        <p class="playlist__meta">

            ${movie.year}

            •

            ⭐ ${movie.rating ?? "N/A"}

        </p>

    </div>

</article>

`).join("");
    }

    /*==============================================
        Active Movie
    ==============================================*/

    setActiveMovie(slug) {

        const cards =

            this.container.querySelectorAll(

                ".playlist__card"

            );

        cards.forEach(card => {

            card.classList.toggle(

                "is-active",

                card.dataset.slug === slug

            );

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

        this.clear();

        this.elements = {};

    }

}

export const playlistView = new PlaylistView();