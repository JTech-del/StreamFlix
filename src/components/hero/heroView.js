"use strict";

/*==================================================
    Hero View

    Responsibility:
    Handles all DOM rendering for the Hero component.

==================================================*/

import { heroLayout } from "./heroLayout.js";

class HeroView {

    constructor() {

        this.container = null;

        this.elements = {};

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        this.container = container;

    }

    /*==============================================
        Render
    ==============================================*/

    render(hero) {

        if (!this.container) {

            console.error("Hero container not found.");

            return;

        }

        this.container.innerHTML = heroLayout(hero);

        this.cacheElements();

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            section: this.container.querySelector(".hero"),

            watchButton: this.container.querySelector(".hero__watch"),

            trailerButton: this.container.querySelector(".hero__trailer"),

            listButton: this.container.querySelector(".hero__list"),

            background: this.container.querySelector(".hero__background-image")

        };

    }

    /*==============================================
        Update Background
    ==============================================*/

    updateBackground(image) {

        if (!this.elements.background) return;

        this.elements.background.src = image;

    }

    /*==============================================
        Clear
    ==============================================*/

    clear() {

        if (!this.container) return;

        this.container.innerHTML = "";

    }

}

export const heroView = new HeroView();