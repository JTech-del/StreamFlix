"use strict";

/*==================================================
    StreamFlix

    Mini Theatre View

    Responsibility:

    ✓ Render Mini Theatre
    ✓ Cache DOM Elements
    ✓ Render Playlist
    ✓ Update Preview
    ✓ Manage Active Playlist Item
    ✓ Reset UI

==================================================*/

import { miniTheatreLayout } from "./miniTheatreLayout.js";

class MiniTheatreView {

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

            console.error("Mini Theatre container not found.");

            return;

        }

        this.container.innerHTML = miniTheatreLayout();

        this.cacheElements();


    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            section:

                this.container.querySelector(".miniTheatre"),

            playlist:

                this.container.querySelector(".miniTheatre__playlist"),

            playlistTrack:

                this.container.querySelector(".miniTheatre__playlist-track"),

            preview:

                this.container.querySelector(".miniTheatre__preview"),

            previewMedia:

                this.container.querySelector(".miniTheatre__preview-media"),

            poster:

                this.container.querySelector(".miniTheatre__poster"),

            video:

                this.container.querySelector(".miniTheatre__video"),

            content:

                this.container.querySelector(".miniTheatre__content"),

            movieTitle:

                this.container.querySelector(".miniTheatre__movie-title"),

            movieMeta:

                this.container.querySelector(".miniTheatre__movie-meta"),

            controls:

                this.container.querySelector(".miniTheatre__controls"),

            plugins:

                this.container.querySelector(".miniTheatre__plugins")

        };

    }

    /*==============================================
        Render Playlist
    ==============================================*/

    renderPlaylist(markup = "") {

        if (!this.elements.playlistTrack) {

            return;

        }

        this.elements.playlistTrack.innerHTML = markup;

    }

    /*==============================================
        Show Poster
    ==============================================*/

    showPoster(movie) {

        if (!movie || !this.elements.poster) {

            return;

        }

        this.elements.poster.src = movie.poster;

        this.elements.poster.alt = movie.title;

        this.elements.poster.hidden = false;

        if (this.elements.video) {

            this.elements.video.pause();

            this.elements.video.removeAttribute("src");

            this.elements.video.load();

            this.elements.video.hidden = true;

        }

    }

    /*==============================================
        Show Highlight
    ==============================================*/

    showHighlight(movie) {

        if (

            !movie ||

            !movie.highlight ||

            !this.elements.video

        ) {

            return;

        }

        this.elements.video.src = movie.highlight;

        this.elements.video.hidden = false;

        if (this.elements.poster) {

            this.elements.poster.hidden = true;

        }

    }

    /*==============================================
        Update Information
    ==============================================*/

    updateInformation(movie) {

        if (!movie) {

            return;

        }

        this.elements.movieTitle.textContent =

            movie.title;

        this.elements.movieMeta.textContent =

            [

                movie.year,

                movie.runtime,

                movie.rating

            ]

        .filter(Boolean)

        .join(" • ");

    }

    /*==============================================
        Show Preview
    ==============================================*/

    showPreview(movie) {

        if (!movie) {

            this.clearPreview();

            return;

        }

        this.showPoster(movie);

        this.updateInformation(movie);

    }

    /*==============================================
        Set Active Movie
    ==============================================*/

    setActiveMovie(slug) {

            if (!this.elements.playlistTrack) {

                return;

            }

            const items =

                this.elements.playlistTrack.querySelectorAll(

                    ".miniTheatre__playlist-item"

                );

            items.forEach(item => {

                item.classList.toggle(

                    "is-active",

                    item.dataset.slug === slug

                );

            });

        }
        /*==============================================
            Render Preview
        ==============================================*/

    renderPreview(movie) {

            if (!movie) {

                return;

            }

            const {

                poster,

                highlight

            } = this.elements;

            if (poster) {

                poster.src = movie.poster;

                poster.alt = movie.title;

            }

            if (highlight) {

                highlight.src = movie.trailer;

            }

            highlight.load();

            this.showPoster();

        }
        /*==============================================
            Show Highlight
        ==============================================*/

    showHighlight() {

        const media =

            this.container.querySelector(

                ".mini-theatre__media"

            );

        if (!media) {

            return;

        }

        media.classList.add(

            "is-playing"

        );

    }

    /*==============================================
        Show Poster
    ==============================================*/

    showPoster() {

        const media =

            this.container.querySelector(

                ".mini-theatre__media"

            );

        if (!media) {

            return;

        }

        media.classList.remove(

            "is-playing"

        );

    }

    /*==============================================
        Clear Preview
    ==============================================*/

    clearPreview() {

        if (this.elements.poster) {

            this.elements.poster.hidden = true;

            this.elements.poster.removeAttribute("src");

        }

        if (this.elements.video) {

            this.elements.video.pause();

            this.elements.video.removeAttribute("src");

            this.elements.video.load();

            this.elements.video.hidden = true;

        }

        if (this.elements.movieTitle) {

            this.elements.movieTitle.textContent =

                "Select a Movie";

        }

        if (this.elements.movieMeta) {

            this.elements.movieMeta.textContent =

                "Preview information will appear here.";

        }

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

export const miniTheatreView = new MiniTheatreView();