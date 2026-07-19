"use strict";

/*======================================
  File: src/data/navbar/navigation.js

  Description:
  Immutable navigation menu configuration
  for the StreamFlix navbar.

  Responsibilities:
  ✓ Define navigation links.
  ✓ Provide default active item.
  ✓ Export immutable data.

======================================*/

/**
 * Immutable navigation menu.
 *
 * @type {Readonly<Array>}
 */
export const NAVIGATION = Object.freeze([{
        id: 1,
        label: "Home",
        href: "#home",
        route: "home",
        active: true
    },

    {
        id: 2,
        label: "Movies",
        href: "#movies",
        route: "movies",
        active: false
    },

    {
        id: 3,
        label: "TV Shows",
        href: "#tv-shows",
        route: "tv-shows",
        active: false
    },

    {
        id: 4,
        label: "Discover",
        href: "#discover",
        route: "discover",
        active: false
    },

    {
        id: 5,
        label: "My List",
        href: "#my-list",
        route: "my-list",
        active: false
    }
]);