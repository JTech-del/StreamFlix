"use strict";

/*==================================================
    Media Rail Templates

    Responsibility:
    Generates HTML templates for MediaRail.

==================================================*/

import { mediaRailLayout }

from "./mediaRailLayout.js";

const {

    classes,

    attributes

} = mediaRailLayout;

/*==================================================
    Templates
==================================================*/

export const mediaRailTemplates = {

    /*==============================================
        Default Item
    ==============================================*/

    item(movie, index = 0) {

        return `

            <article

                class="mediaRail__item"

                ${attributes.slug}="${movie.slug}"

                ${attributes.index}="${index}"

                ${attributes.id}="${movie.id}"

                tabindex="0"

            >

                <div class="mediaRail__poster">

                    <img

                        src="${movie.thumbnail}"

                        alt="${movie.title}"

                        loading="lazy"

                    >

                </div>

                <div class="mediaRail__overlay">

                    <h3 class="mediaRail__title">

                        ${movie.title}

                    </h3>

                </div>

            </article>

        `;

    },

    /*==============================================
        Playlist Item
    ==============================================*/

    playlist(movie, index = 0) {

        return `

            <article

                class="mediaRail__item mediaRail__item--playlist"

                ${attributes.slug}="${movie.slug}"

                ${attributes.index}="${index}"

                ${attributes.id}="${movie.id}"

                tabindex="0"

            >

                <div class="mediaRail__thumbnail">

                    <img

                        src="${movie.thumbnail}"

                        alt="${movie.title}"

                        loading="lazy"

                    >

                </div>

                <div class="mediaRail__content">

                    <h3>

                        ${movie.title}

                    </h3>

                    <p>

                        ${movie.genre || ""}

                    </p>

                </div>

            </article>

        `;

    },

    /*==============================================
        Poster Item
    ==============================================*/

    poster(movie, index = 0) {

        return `

            <article

                class="mediaRail__item mediaRail__item--poster"

                ${attributes.slug}="${movie.slug}"

                ${attributes.index}="${index}"

                ${attributes.id}="${movie.id}"

                tabindex="0"

            >

                <img

                    src="${movie.poster}"

                    alt="${movie.title}"

                    loading="lazy"

                >

            </article>

        `;

    }

};