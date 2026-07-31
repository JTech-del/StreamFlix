"use strict";

/*==================================================
    StreamFlix

    Mini Theatre View

    Responsibility

    ✓ Render Layout
    ✓ Cache DOM
    ✓ Render Theatre
    ✓ Render Playlist
    ✓ Update UI

==================================================*/

import { miniTheatreTemplates } from "./miniTheatreTemplates.js";
import { miniTheatreLayout } from "./miniTheatreLayout.js";

class MiniTheatreView {
    /*==============================================
        Constructor
    ==============================================*/

    constructor() {

        this.elements = {

            root: null,

            screen: null,

            playlist: null,

            poster: null,

            video: null,

            playButton: null,

            resumeButton: null,

            removeButton: null,

            title: null,

            metadata: null

        };

    }

    /*==============================================
        Initialize
    ==============================================*/
    init(container) {

        if (!container) {

            console.error(
                "Mini Theatre container not found."
            );

            return;

        }

        this.elements.root = container;

        this.renderLayout();

    }

    /*==============================================
        Render Layout
    ==============================================*/

    renderLayout() {

        this.elements.root.innerHTML =

            miniTheatreTemplates.layout();

        this.cache();

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cache() {

            this.elements.screen =

                this.elements.root.querySelector(
                    ".mini-theatre__screen"
                );

            this.elements.playlist =

                this.elements.root.querySelector(
                    ".playlist__track"
                );

            this.elements.counter =

                this.elements.root.querySelector(
                    ".playlist__counter"
                );

        }
        /*==============================================
               Cache Media
           ==============================================*/

    cacheMedia() {

            this.elements.poster =
                this.elements.screen.querySelector(
                    ".mini-theatre__poster"
                );

            this.elements.video =
                this.elements.screen.querySelector(
                    ".mini-theatre__video"
                );

            this.elements.playButton =
                this.elements.screen.querySelector(
                    ".mini-theatre__play"
                );

            this.elements.resumeButton =
                this.elements.screen.querySelector(
                    ".mini-theatre__resume"
                );

            this.elements.removeButton =
                this.elements.screen.querySelector(
                    ".mini-theatre__remove"
                );

            this.elements.title =
                this.elements.screen.querySelector(
                    ".mini-theatre__title"
                );

            this.elements.metadata =
                this.elements.screen.querySelector(
                    ".mini-theatre__metadata"
                );

        }
        /*==============================================
            Render Movie
        ==============================================*/

    renderMovie(movie) {

        if (!movie) {

            return;

        }

        /*
        First movie.
        */

        if (!this.elements.poster) {

            this.elements.screen.innerHTML =

                miniTheatreTemplates.theatre(movie);

            this.cacheMedia();

            return;

        }

        /*
        Existing theatre.
        */

        this.updatePoster(movie);

        this.updateVideo(movie);

    }

    /*==============================================
    Update Poster
==============================================*/

    updatePoster(movie) {

        if (!this.elements.poster) {

            return;

        }

        this.elements.poster.src = movie.poster;

        this.elements.poster.alt = movie.title;

    }

    /*==============================================
        Update Video
    ==============================================*/

    updateVideo(movie) {

        if (!this.elements.video) {

            return;

        }

        this.elements.video.pause();

        const source =

            this.elements.video.querySelector(
                "source"
            );

        if (!source) {

            return;

        }

        source.src = movie.video;

        this.elements.video.load();

        this.showPoster();

    }


    /*==============================================
        Load Video
    ==============================================*/

    loadVideo() {

            if (!this.elements.video) {

                return;

            }

            this.elements.video.load();

        }
        /*==============================================
            Play Video
        =================================================*/

    async playVideo() {
        console.log(
            this.elements.video
        );
        if (!this.elements.video) {

            return;

        }


        try {

            await this.elements.video.play();

        } catch (error) {

            console.error(

                "Video playback failed:",

                error

            );

        }

    }

    /*==============================================
        Pause Video
    ==============================================*/

    pauseVideo() {

            if (!this.elements.video) {

                return;

            }

            this.elements.video.pause();

        }
        /*==============================================
            Reset Video
        ==============================================*/

    resetVideo() {

            if (!this.elements.video) {

                return;

            }

            this.elements.video.pause();

            this.elements.video.currentTime = 0;

        }
        /*==============================================
    Show Poster
==============================================*

    showPoster() {

        if (this.elements.poster) {

            this.elements.poster.hidden = false;

        }

        if (this.elements.video) {

            this.elements.video.hidden = true;

        }

    }
*/
        /*==============================================
            Show Poster
        ==============================================*/

    showPoster() {

        if (!this.elements.poster || !this.elements.video) {

            return;

        }

        this.elements.poster.style.display = "block";

        this.elements.video.style.display = "none";

    }

    /*==============================================
        Show Video
    ==============================================*/

    showVideo() {

        if (!this.elements.poster || !this.elements.video) {

            return;

        }

        this.elements.poster.style.display = "none";

        this.elements.video.style.display = "block";

    }

    /*==============================================
        Show Video next
    ==============================================*

    showVideo() {

            if (this.elements.poster) {

                this.elements.poster.hidden = true;

            }

            if (this.elements.video) {

                this.elements.video.hidden = false;

            }

        }
            *

    showVideo() {

            if (!this.elements.poster || !this.elements.video) {

                return;

            }

            this.elements.poster.hidden = true;

            this.elements.video.hidden = false;

            console.log("Poster hidden:", this.elements.poster.hidden);
            console.log("Video hidden:", this.elements.video.hidden);
            console.log("Video display:", getComputedStyle(this.elements.video).display);
            console.log("Poster display:", getComputedStyle(this.elements.poster).display);
            console.log("Video visibility:", getComputedStyle(this.elements.video).visibility);
            console.log("Video opacity:", getComputedStyle(this.elements.video).opacity);

        }
        /*==============================================
    Bind Play
==============================================*/

    bindPlay(handler) {

        if (!this.elements.playButton) {

            return;

        }

        this.elements.playButton.onclick = handler;

    }

    /*==============================================
        Bind Resume
    ==============================================*/

    bindResume(handler) {

        if (!this.elements.resumeButton) {

            return;

        }

        this.elements.resumeButton.onclick = handler;

    }

    /*==============================================
        Bind Remove
    ==============================================*/

    bindRemove(handler) {

        if (!this.elements.removeButton) {

            return;

        }

        this.elements.removeButton.onclick = handler;

    }

    /*==============================================
        Bind Playlist Click good
    ==============================================*/

    bindPlaylistClick(handler) {

        if (!this.elements.playlist) {

            return;

        }

        this.elements.playlist.onclick = event => {

            const card = event.target.closest(".playlist-card");

            if (!card) {

                return;

            }

            handler(

                Number(

                    card.dataset.index

                )

            );

        };

    }

    /*==============================================
        Render Playlist good
    ==============================================*/

    renderPlaylist(movies = []) {

        if (!this.elements.playlist) {

            return;

        }

        this.elements.playlist.innerHTML =

            movies.map(

                (movie, index) =>

                miniTheatreTemplates.playlistCard(

                    movie,

                    index

                )

            ).join("");

        this.updateCounter(

            movies.length

        );

    }



    /*==============================================
        Playlist Counter good
    ==============================================*/

    updateCounter(count) {

        if (!this.elements.counter) {

            return;

        }

        this.elements.counter.textContent = count;

    }

    /*==============================================
       Set Active Playlist item good
    ==============================================*/

    setActive(index) {

        if (!this.elements.playlist) {

            return;

        }

        this.elements.playlist

            .querySelectorAll(".playlist-card")

        .forEach(card =>

            card.classList.remove(

                "is-active"

            )

        );

        const active =

            this.elements.playlist.querySelector(

                `[data-index="${index}"]`

            );

        if (!active) {

            return;

        }

        active.classList.add(

            "is-active"

        );

    }

    /*==============================================
        Scroll Active 
    ==============================================*/

    scrollToActive(index) {


        if (!this.elements.playlist) {

            return;

        }

        const active =

            this.elements.playlist.querySelector(

                `[data-index="${index}"]`

            );

        if (!active) {

            return;

        }

        active.scrollIntoView({

            behavior: "smooth",

            block: "nearest",

            inline: "nearest"

        });

    }

    /*==============================================
        Poster
    ==============================================*

    showPoster() {

        if (!this.elements.poster ||

            !this.elements.video) {

            return;

        }

        this.elements.poster.hidden = false;

        this.elements.video.hidden = true;

    }

    /*==============================================
        Video
    ==============================================*

    showVideo() {

        if (!this.elements.poster ||

            !this.elements.video) {

            return;

        }

        this.elements.poster.hidden = true;

        this.elements.video.hidden = false;

    }

    /*==============================================
    Clear Theatre good
==============================================*/

    clear() {

        if (this.elements.screen) {

            this.elements.screen.innerHTML = "";

        }

        if (this.elements.playlist) {

            this.elements.playlist.innerHTML = "";

        }

    }

}

export const miniTheatreView =
    new MiniTheatreView();