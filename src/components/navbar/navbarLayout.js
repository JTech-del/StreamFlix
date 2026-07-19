"use strict";

/*======================================
  File:
  src/components/navbar/navbarLayout.js

  Description:
  Generates the StreamFlix navbar markup.
======================================*/

import {
    BRAND,
    NAVIGATION,
    NAVBAR_ACTIONS
} from "../../data/navbar/index.js";

export function createNavbarLayout() {

    const navigationMarkup = NAVIGATION.map(item => `
        <li class="navbar__item">
            <a href="${item.href}"class="navbar__link
             ${item.active ? "is-active" : ""}" data-route="${item.route}">

                ${item.label}
            </a>
        </li>
    `).join("");

    const actionsMarkup = NAVBAR_ACTIONS
        .filter(action => action.visible && !action.mobileOnly)
        .map(action => `
            <button
                class="navbar__action"
                type="button"
                data-action="${action.name}"
                aria-label="${action.ariaLabel}"
            >
                <i data-lucide="${action.icon}"></i>
            </button>
        `).join("");

    return `
<header class="navbar">

    <div class="navbar__container">

        <!-- Brand -->

        <a
            href="#home"
            class="navbar__brand"
            aria-label="${BRAND.name}"
        >
            <i
                class="navbar__logo"
                data-lucide="${BRAND.logo.icon}"
            ></i>

            <span class="navbar__title">
                ${BRAND.logo.text}
            </span>
        </a>

        <!-- Desktop Navigation -->

        <nav
            class="navbar__navigation"
            aria-label="Primary Navigation"
        >
            <ul class="navbar__menu">
                ${navigationMarkup}
            </ul>
        </nav>

        <!-- Right Actions -->

        <div class="navbar__actions">

            ${actionsMarkup}

            <button
                class="navbar__action navbar__menu-toggle"
                type="button"
                aria-label="Open navigation"
                data-action="menu"
                aria-expanded="false"
            >
                <i data-lucide="menu"></i>
            </button>

        </div>

    </div>

</header>
`;
}