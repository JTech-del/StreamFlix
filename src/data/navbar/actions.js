"use strict";

/*======================================
  File: src/data/navbar/actions.js

  Description:
  Immutable action button configuration
  for the StreamFlix navbar.

  Responsibilities:
  ✓ Define action buttons.
  ✓ Provide Lucide icon names.
  ✓ Export immutable data.

======================================*/

/**
 * Immutable navbar action buttons.
 *
 * @type {Readonly<Array>}
 */
export const NAVBAR_ACTIONS = Object.freeze([{
        id: 1,
        name: "search",
        label: "Search",
        icon: "search",
        ariaLabel: "Open search",
        visible: true
    },

    {
        id: 2,
        name: "notifications",
        label: "Notifications",
        icon: "bell",
        ariaLabel: "View notifications",
        visible: true
    },

    {
        id: 3,
        name: "profile",
        label: "Profile",
        icon: "circle-user-round",
        ariaLabel: "Open profile menu",
        visible: true
    },

    {
        id: 4,
        name: "menu",
        label: "Menu",
        icon: "menu",
        ariaLabel: "Open navigation menu",
        visible: true,
        mobileOnly: true
    }
]);