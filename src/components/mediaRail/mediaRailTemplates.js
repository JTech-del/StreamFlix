"use strict";

/*==================================================
    StreamFlix Media Rail Templates

    Responsibility:

    ✓ Generate Media Rail movie markup
    ✓ Movie poster
    ✓ Movie title
    ✓ Rating
    ✓ Theatre action
    ✓ Thumb Up action
    ✓ Thumb Down action
    ✓ My List action
    ✓ Download action
    ✓ Accessibility hooks

    Design Rule:

    All StreamFlix Media Rails use the
    SAME visual card structure.

    Different rails should change:

    ✓ Rail title
    ✓ Movie data
    ✓ Movie collection

    They should NOT change:

    ✗ Card structure
    ✗ Card visual language
    ✗ Action placement
    ✗ Poster proportions
    ✗ Rating position

    Does NOT handle:

    ✗ Theatre playback
    ✗ Download logic
    ✗ My List state
    ✗ Application state
    ✗ Business logic

==================================================*/


import {
    mediaRailAttributes
} from "./mediaRailLayout.js";


const attributes =
    mediaRailAttributes;


/*==================================================
    Helpers
==================================================*/

function getMovieTitle(movie) {

    if (
        movie &&
        movie.title
    ) {

        return movie.title;

    }


    return "Untitled";

}


function getMoviePoster(movie) {

    if (
        movie &&
        movie.poster
    ) {

        return movie.poster;

    }


    return "";

}


function getMovieId(movie) {

    if (
        movie &&
        movie.id !== undefined &&
        movie.id !== null
    ) {

        return movie.id;

    }


    return "";

}


function getMovieSlug(movie) {

    if (
        movie &&
        movie.slug
    ) {

        return movie.slug;

    }


    return "";

}


function getMovieRating(movie) {

    if (
        movie &&
        movie.rating !== undefined &&
        movie.rating !== null &&
        movie.rating !== ""
    ) {

        return movie.rating;

    }


    return "N/A";

}


function getMovieYear(movie) {

    if (
        movie &&
        movie.year
    ) {

        return movie.year;

    }


    return "";

}


function getMovieDuration(movie) {

    if (
        movie &&
        movie.duration
    ) {

        return movie.duration;

    }


    if (
        movie &&
        movie.runtime
    ) {

        return movie.runtime;

    }


    return "";

}


function getMovieQuality(movie) {

    if (
        movie &&
        movie.quality
    ) {

        return movie.quality;

    }


    return "HD";

}


/*==================================================
    Templates
==================================================*/

export const mediaRailTemplates = {


    /*==================================================
        Standard Media Rail Item

        This is the PRIMARY StreamFlix card.

        All recommendation-style rails should
        use this template.

        Examples:

        Recommended
        New Releases
        Trending
        Watchlist
        Because You Watched
        Popular Movies
    ==================================================*/

    item(movie, index = 0) {

        const title =
            getMovieTitle(movie);


        const poster =
            getMoviePoster(movie);


        const id =
            getMovieId(movie);


        const slug =
            getMovieSlug(movie);


        const rating =
            getMovieRating(movie);


        const year =
            getMovieYear(movie);


        const duration =
            getMovieDuration(movie);


        const quality =
            getMovieQuality(movie);


        return `

        <article

            class="mediaRail__item"

            ${attributes.slug}="${slug}"

            ${attributes.index}="${index}"

            ${attributes.id}="${id}"

            tabindex="0"

            role="article"

            aria-selected="false"

        >

            <!--==================================
                Movie Poster
            ==================================-->

            <div class="mediaRail__poster">

                <img

                    src="${poster}"

                    alt="${title}"

                    loading="lazy"

                >


                <!--==================================
                    Rating — TOP RIGHT
                ==================================-->

                <div

                    class="mediaRail__rating"

                    aria-label="Rating ${rating}"

                >

                    <i

                        data-lucide="star"

                        aria-hidden="true"

                    ></i>

                    <span>

                        ${rating}

                    </span>

                </div>


                <!--==================================
                    Cinematic Overlay
                ==================================-->

                <div class="mediaRail__overlay">


                    <!--==================================
                        Theatre — CENTER
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--theatre"

                        data-action="theatre"

                        data-movie-id="${id}"

                        aria-label="Watch ${title} in Theatre"

                        title="Watch in Theatre"

                    >

                        <i

                            data-lucide="tv"

                            aria-hidden="true"

                        ></i>

                        <span>

                            Theatre

                        </span>

                    </button>


                </div>

            </div>


            <!--==================================
                Movie Content
            ==================================-->

            <div class="mediaRail__content">


                <!--==================================
                    Movie Title
                ==================================-->

                <h3 class="mediaRail__title">

                    ${title}

                </h3>


                <!--==================================
                    Movie Metadata
                ==================================-->

                <p class="mediaRail__meta">

                    <span>

                        ${year}

                    </span>

                    <span class="mediaRail__meta-separator">

                        •

                    </span>

                    <span>

                        ${duration}

                    </span>

                    <span class="mediaRail__meta-separator">

                        •

                    </span>

                    <span>

                        ${quality}

                    </span>

                </p>


                <!--==================================
                    Bottom Actions
                ==================================-->

                <div

                    class="mediaRail__actions"

                    aria-label="${title} actions"

                >


                    <!--==================================
                        Thumb Up
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--thumb-up"

                        data-action="thumb-up"

                        data-movie-id="${id}"

                        aria-label="Like ${title}"

                        title="Like"

                    >

                        <i

                            data-lucide="thumbs-up"

                            aria-hidden="true"

                        ></i>

                    </button>


                    <!--==================================
                        Thumb Down
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--thumb-down"

                        data-action="thumb-down"

                        data-movie-id="${id}"

                        aria-label="Dislike ${title}"

                        title="Dislike"

                    >

                        <i

                            data-lucide="thumbs-down"

                            aria-hidden="true"

                        ></i>

                    </button>


                    <!--==================================
                        My List
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--my-list"

                        data-action="my-list"

                        data-movie-id="${id}"

                        aria-label="Add ${title} to My List"

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


                    <!--==================================
                        Download
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--download"

                        data-action="download"

                        data-movie-id="${id}"

                        aria-label="Download ${title}"

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

        `;

    },


    /*==================================================
        Playlist Item

        Kept for existing playlist functionality.

        This does NOT create a different visual
        recommendation rail.

        It remains available for playlist usage.
    ==================================================*/

    playlist(movie, index = 0) {

        const title =
            getMovieTitle(movie);


        const id =
            getMovieId(movie);


        const slug =
            getMovieSlug(movie);


        const thumbnail =
            movie && movie.thumbnail ?
            movie.thumbnail :
            getMoviePoster(movie);


        const genre =
            movie && movie.genre ?
            movie.genre :
            "";


        return `

            <article

                class="mediaRail__item
                       mediaRail__item--playlist"

                ${attributes.slug}="${slug}"

                ${attributes.index}="${index}"

                ${attributes.id}="${id}"

                tabindex="0"

                role="article"

                aria-selected="false"

            >

                <div class="mediaRail__thumbnail">

                    <img

                        src="${thumbnail}"

                        alt="${title}"

                        loading="lazy"

                    >

                </div>


                <div class="mediaRail__content">

                    <h3 class="mediaRail__title">

                        ${title}

                    </h3>


                    <p class="mediaRail__meta">

                        ${genre}

                    </p>


                    <div

                        class="mediaRail__actions"

                        aria-label="${title} actions"

                    >


                        <button

                            type="button"

                            class="mediaRail__action
                                   mediaRail__action--theatre"

                            data-action="theatre"

                            data-movie-id="${id}"

                            aria-label="Watch ${title} in Theatre"

                            title="Watch in Theatre"

                        >

                            <i

                                data-lucide="tv"

                                aria-hidden="true"

                            ></i>

                        </button>


                        <button

                            type="button"

                            class="mediaRail__action
                                   mediaRail__action--download"

                            data-action="download"

                            data-movie-id="${id}"

                            aria-label="Download ${title}"

                            title="Download"

                        >

                            <i

                                data-lucide="download"

                                aria-hidden="true"

                            ></i>

                        </button>


                        <button

                            type="button"

                            class="mediaRail__action
                                   mediaRail__action--my-list"

                            data-action="my-list"

                            data-movie-id="${id}"

                            aria-label="Add ${title} to My List"

                            title="Add to My List"

                        >

                            <i

                                data-lucide="plus"

                                aria-hidden="true"

                            ></i>

                        </button>


                    </div>

                </div>

            </article>

        `;

    },


    /*==================================================
        Poster Item

        Preserved for compatibility with existing
        StreamFlix components.

        Recommendation rails should normally use
        the standard "item" template so all rails
        remain visually identical.
    ==================================================*/

    poster(movie, index = 0) {

        const title =
            getMovieTitle(movie);


        const poster =
            getMoviePoster(movie);


        const id =
            getMovieId(movie);


        const slug =
            getMovieSlug(movie);


        return `

            <article

                class="mediaRail__item
                       mediaRail__item--poster"

                ${attributes.slug}="${slug}"

                ${attributes.index}="${index}"

                ${attributes.id}="${id}"

                tabindex="0"

                role="article"

                aria-selected="false"

            >

                <div class="mediaRail__poster">

                    <img

                        src="${poster}"

                        alt="${title}"

                        loading="lazy"

                    >


                    <!--==================================
                        Theatre
                    ==================================-->

                    <button

                        type="button"

                        class="mediaRail__action
                               mediaRail__action--theatre"

                        data-action="theatre"

                        data-movie-id="${id}"

                        aria-label="Watch ${title} in Theatre"

                        title="Watch in Theatre"

                    >

                        <i

                            data-lucide="tv"

                            aria-hidden="true"

                        ></i>

                    </button>


                    <!--==================================
                        Overlay
                    ==================================-->

                    <div class="mediaRail__overlay">


                        <h3 class="mediaRail__title">

                            ${title}

                        </h3>


                        <div

                            class="mediaRail__actions"

                            aria-label="${title} actions"

                        >

                            <button

                                type="button"

                                class="mediaRail__action
                                       mediaRail__action--download"

                                data-action="download"

                                data-movie-id="${id}"

                                aria-label="Download ${title}"

                                title="Download"

                            >

                                <i

                                    data-lucide="download"

                                    aria-hidden="true"

                                ></i>

                            </button>


                            <button

                                type="button"

                                class="mediaRail__action
                                       mediaRail__action--my-list"

                                data-action="my-list"

                                data-movie-id="${id}"

                                aria-label="Add ${title} to My List"

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

                        </div>

                    </div>

                </div>

            </article>

        `;

    }

};