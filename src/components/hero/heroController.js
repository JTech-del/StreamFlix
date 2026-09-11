"use strict";

/*==================================================
    Hero Controller

    Responsibility:
    Controls the Hero component.

    Media source of truth:
    Backend
==================================================*/

import { heroView } from "./heroView.js";


export class HeroController {

    constructor(rootElement) {

        this.rootElement = rootElement;

        this.currentHero = null;

    }


    /*==============================================
        Initialize
    ==============================================*/

    init(movie = null) {

        if (!this.rootElement) {

            console.error(
                "Hero root element not found."
            );

            return;

        }

        heroView.init(this.rootElement);

        if (!movie) {

            console.warn(
                "Hero initialized without a movie."
            );

            return;

        }

        this.currentHero = movie;

        heroView.render(
            this.currentHero
        );

        this.bindEvents();

    }


    /*==============================================
        Update Hero
    ==============================================*/

    update(movie) {

        if (!movie) {

            console.warn(
                "Hero update received no movie."
            );

            return;

        }

        console.log(
            "Hero updated with backend movie:",
            movie
        );

        console.log(
            "Hero poster URL:",
            movie.posterUrl
        );

        console.log(
            "Hero backdrop URL:",
            movie.backdropUrl
        );

        this.currentHero = movie;

        heroView.render(
            this.currentHero
        );

        this.bindEvents();

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

            watchButton.onclick = () => {

                if (!this.currentHero) {

                    return;

                }

                console.log(
                    "Watch:",
                    this.currentHero.title
                );

            };

        }


        if (trailerButton) {

            trailerButton.onclick = () => {

                if (!this.currentHero) {

                    return;

                }

                console.log(
                    "Trailer:",
                    this.currentHero.title
                );

            };

        }


        if (listButton) {

            listButton.onclick = () => {

                if (!this.currentHero) {

                    return;

                }

                console.log(
                    "My List:",
                    this.currentHero.title
                );

            };

        }

    }

}