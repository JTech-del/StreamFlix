"use strict";

/*==================================================
    Search Layout

    Responsibility:
    Returns the HTML structure for the
    StreamFlix Search component.

==================================================*/

export function searchLayout() {

    return `

<section class="search">

    <div class="search__container">

        <div
            class="search__box"
            role="search"
        >

            <button
                class="search__icon"
                type="button"
                aria-label="Search"
            >

                <i data-lucide="search"></i>

            </button>

            <input

                class="search__input"

                type="search"

                placeholder="Search movies, TV shows..."

                autocomplete="off"

                spellcheck="false"

                aria-label="Search movies"

            >

            <button

                class="search__clear"

                type="button"

                aria-label="Clear search"

            >

                <i data-lucide="x"></i>

            </button>

        </div>

        <div

            class="search__results"

            role="listbox"

            aria-label="Search Results"

        ></div>

    </div>

</section>

`;

}