"use strict";

/*==================================================
    Subtitle View

    Responsibility:

    ✓ Renders subtitle UI
    ✓ Shows/Hides controls
    ✓ Updates available languages

==================================================*/

class SubtitleView {

    constructor() {

        this.container = null;

        this.elements = {};

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(container) {

        if (!container) {

            return;

        }

        this.container = container;

        this.cacheElements();

    }

    /*==============================================
        Cache Elements
    ==============================================*/

    cacheElements() {

        this.elements = {

            button:

                this.container.querySelector(
                '[data-subtitle-button]'
            ),

            menu:

                this.container.querySelector(
                '[data-subtitle-menu]'
            )

        };

    }

    /*==============================================
        Render Languages
    ==============================================*/

    renderLanguages(languages = []) {

        if (!this.elements.menu) {

            return;

        }

        this.elements.menu.innerHTML = languages
            .map(language => `
                <button
                    class="subtitle__option"
                    data-language="${language}"
                    type="button">

                    ${language}

                </button>
            `)
            .join("");

    }

    /*==============================================
        Show Menu
    ==============================================*/

    showMenu() {

        if (!this.elements.menu) {

            return;

        }

        this.elements.menu.hidden = false;

    }

    /*==============================================
        Hide Menu
    ==============================================*/

    hideMenu() {

        if (!this.elements.menu) {

            return;

        }

        this.elements.menu.hidden = true;

    }

    /*==============================================
        Toggle Menu
    ==============================================*/

    toggleMenu() {

        if (!this.elements.menu) {

            return;

        }

        this.elements.menu.hidden =

            !this.elements.menu.hidden;

    }

}

export const subtitleView =
    new SubtitleView();