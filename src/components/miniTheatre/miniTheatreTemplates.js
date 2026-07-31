"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Templates

    Responsibility

    ✓ Build Mini Theatre Layout
    ✓ Build Theatre Screen
    ✓ Build Metadata
    ✓ Build Controls
    ✓ Build Playlist
    ✓ Build Playlist Cards

==================================================*/

class MiniTheatreTemplates {

    /*==============================================
        Main Layout
    ==============================================*/

    layout() {

        return `

            <section class="mini-theatre">

                <div class="mini-theatre__screen">

                    <div class="mini-theatre__placeholder">

                        <p>

                            Your selected movie will appear here.

                        </p>

                    </div>

                </div>

                <aside class="mini-theatre__playlist">

                    <header class="playlist__header">

                        <h2 class="playlist__title">

                            My Playlist

                        </h2>

                        <span class="playlist__counter">

                            0

                        </span>

                    </header>

                    <div class="playlist__track">

                    </div>

                </aside>

            </section>

        `;

    }

    /*==============================================
        Theatre
    ==============================================*/

    theatre(movie) {

        return `

            <div class="mini-theatre__media">

                ${this.poster(movie)}

                ${this.video(movie)}

            </div>

            <div class="mini-theatre__overlay">

                ${this.metadata(movie)}

                ${this.controls()}

            </div>

        `;

    }

    /*==============================================
        Poster
    ==============================================*/

    poster(movie) {

        return `

            <img

                class="mini-theatre__poster"

                src="${movie.poster}"

                alt="${movie.title}"

            >

        `;

    }

    /*==============================================
        Video
    ==============================================*/

    video(movie) {

        return `

            <video

                class="mini-theatre__video"

                hidden

                muted

                loop

                playsinline

                preload="metadata"

            >

                <source

                    src="${movie.video}"

                    type="video/mp4"

                >

            </video>

        `;

    }

    /*==============================================
        Metadata
    ==============================================*/

    metadata(movie) {

        return `

            <div class="mini-theatre__metadata">

                <h2 class="mini-theatre__title">

                    ${movie.title}

                </h2>

                <div class="mini-theatre__details">

                    <span class="mini-theatre__year">

                        ${movie.year}

                    </span>

                    <span class="mini-theatre__duration">

                        ${movie.duration}

                    </span>

                    <span class="mini-theatre__rating">

                        ${movie.rating}

                    </span>

                </div>

                <p class="mini-theatre__description">

                    ${movie.description}

                </p>

            </div>

        `;

    }

    /*==============================================
        Controls
    ==============================================*/

    controls() {

        return `

            <div class="mini-theatre__controls">

                <button

                    class="mini-theatre__play"

                    type="button"

                >

                    ▶ Play

                </button>

                <button

                    class="mini-theatre__resume"

                    type="button"

                >

                    Resume

                </button>

                <button

                    class="mini-theatre__remove"

                    type="button"

                >

                    Remove

                </button>

            </div>

        `;

    }

    /*==============================================
        Playlist Card
    ==============================================*/

    playlistCard(movie, index) {

        return `

            <article

                class="playlist-card"

                data-index="${index}"

                data-slug="${movie.slug}"

            >

                <img

                    class="playlist-card__poster"

                    src="${movie.poster}"

                    alt="${movie.title}"

                >

                <div class="playlist-card__content">

                    <h3 class="playlist-card__title">

                        ${movie.title}

                    </h3>

                    <small class="playlist-card__duration">

                        ${movie.duration}

                    </small>

                </div>

            </article>

        `;

    }

}

export const miniTheatreTemplates =
    new MiniTheatreTemplates();