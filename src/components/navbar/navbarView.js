"use strict";

/*======================================
  File: src/components/navbar/navbarView.js

  Description:
  Responsible for rendering the navbar
  into the DOM.

  Responsibilities:
  ✓ Render navbar
  ✓ Update navbar
  ✓ Remove navbar

  Does NOT:
  ✗ Generate HTML
  ✗ Handle events
  ✗ Manage state
======================================*/

import { createNavbarLayout } from "./navbarLayout.js";

export class NavbarView {

    /**
     * @param {HTMLElement} rootElement
     */
    constructor(rootElement) {

        if (!(rootElement instanceof HTMLElement)) {
            throw new Error(
                "NavbarView requires a valid HTMLElement."
            );
        }

        this.rootElement = rootElement;
    }

    /**
     * Initial render.
     */
    render() {
        this.rootElement.innerHTML = createNavbarLayout();
    }

    /**
     * Re-render the navbar.
     */
    update() {
        this.render();
    }

    /**
     * Remove navbar markup.
     */
    remove() {
        this.rootElement.innerHTML = "";
    }

    /**
     * Destroy the view.
     */
    destroy() {
        this.remove();
        this.rootElement = null;
    }

    /**
     * Returns the root element.
     *
     * @returns {HTMLElement|null}
     */
    getElement() {
        return this.rootElement;
    }

}