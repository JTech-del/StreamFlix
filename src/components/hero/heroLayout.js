"use strict";

/*==================================================
    Hero Layout

    Responsibility:
    Returns the static HTML structure for the
    Featured Showcase.

    Media source of truth:
    Backend
==================================================*/

export function heroLayout(hero) {

    return `

<section class="hero">

    <div class="hero__background">

        <img
            class="hero__background-image"
         src="${hero.backdropUrl || hero.posterUrl ||  ""}"
            alt="${hero.title}"
        >

        <div class="hero__overlay hero__overlay--left"></div>

        <div class="hero__overlay hero__overlay--bottom"></div>

    </div>

    <div class="container">

        <div class="hero__content">

            <div class="hero__badge">

                Featured

            </div>

         <div class="hero__logo">

    ${
        hero.logoUrl
            ? `
                <img
                    src="${hero.logoUrl}"
                    alt="${hero.title} Logo"
                >
            `
            : `
                <h1 class="display-title">
                    ${hero.title}
                </h1>
            `
    }

</div>

            </div>

            <div class="hero__meta">

                <span class="hero__pill">

                    ${hero.imdb ?? "N/A"}

                </span>

                <span class="hero__pill">

                    ${hero.year ?? ""}

                </span>

                <span class="hero__pill">

                    ${hero.duration ?? ""}

                </span>

                <span class="hero__pill">

                    ${hero.rating ?? ""}

                </span>

                <span class="hero__pill">

                    ${hero.quality ?? ""}

                </span>

            </div>

            <p class="hero__description">

                ${hero.description ?? ""}

            </p>

            <div class="hero__genres">

                ${(hero.genres ?? []).map(genre => `

                    <span class="hero__genre">

                        ${genre}

                    </span>

                `).join("")}

            </div>

            <div class="hero__actions">

                <button
                    class="btn btn-primary hero__watch"
                    data-action="watch"
                >

                    ▶ Watch Now

                </button>

                <button
                    class="btn btn-secondary hero__trailer"
                    data-action="trailer"
                >

                    Trailer

                </button>

                <button
                    class="btn btn-secondary hero__list"
                    data-action="list"
                >

                    + My List

                </button>

            </div>

        </div>

    </div>

    <div class="hero__scroll">

        <span>Explore</span>

        <i data-lucide="chevrons-down"></i>

    </div>

</section>

`;

}