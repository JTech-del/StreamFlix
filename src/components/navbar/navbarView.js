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

    /*==============================================
        Render
    ==============================================*/

    render() {

        this.rootElement.innerHTML = createNavbarLayout();

    }

    /*==============================================
        Update
    ==============================================*/

    update() {

        this.render();

    }

    /*==============================================
        Remove
    ==============================================*/

    remove() {

        this.rootElement.innerHTML = "";

    }

    /*==============================================
        Get Root Element
    ==============================================*/

    getElement() {

        return this.rootElement;

    }

    /*==============================================
    Open
==============================================*/

    open() {

        if (!this.elements.section) {

            return;

        }

        this.elements.section.classList.add(

            "is-open"

        );

    }


    /*==============================================
        Close
    ==============================================*/

    close() {

        if (!this.elements.section) {

            return;

        }

        this.elements.section.classList.remove(

            "is-open"

        );

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.remove();

        this.rootElement = null;

    }



}