"use strict";

/*==================================================
    Hero Controller

    Responsibility:
    Controls the Hero component.

==================================================*/

import { HERO_DATA } from "../../data/hero/heroData.js";
import { heroView } from "./heroView.js";

export class HeroController {

    constructor(rootElement) {

        this.rootElement = rootElement;

        this.currentHero = null;

    }

    /*==============================================
        Initialize
    ==============================================*/

    init() {

        heroView.init(this.rootElement);

        this.loadFeaturedHero();

        this.bindEvents();

    }

    /*==============================================
        Load Featured Hero
    ==============================================*/
    /*
        loadFeaturedHero() {

            this.currentHero =
                HERO_DATA.find(movie => movie.featured);

            if (!this.currentHero) {

                console.warn("No featured movie found.");

                return;

            }

            heroView.render(this.currentHero);

        }
            */
    loadFeaturedHero() {

            const featuredHero = HERO_DATA.find(movie => movie.featured);

            if (!featuredHero) {

                console.warn("No featured hero found.");

                return;

            }

            this.currentHero = featuredHero;

            heroView.render(this.currentHero);
        }
        /*==============================================
            Events
        ==============================================*/

    bindEvents() {

        const {

            watchButton,
            trailerButton,
            listButton

        } = heroView.elements;

        if (watchButton) {

            watchButton.addEventListener("click", () => {

                console.log("Watch:", this.currentHero.title);

            });

        }

        if (trailerButton) {

            trailerButton.addEventListener("click", () => {

                console.log("Trailer:", this.currentHero.title);

            });

        }

        if (listButton) {

            listButton.addEventListener("click", () => {

                console.log("My List:", this.currentHero.title);

            });

        }

    }

    /*==============================================
        Update Hero
    ==============================================*/

    update(movie) {

        if (!movie) {

            return;

        }

        this.currentHero = movie;

        heroView.render(this.currentHero);

        this.bindEvents();

    }

}