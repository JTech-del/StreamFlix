/*
"use strict";

class MiniTheatreController {

    constructor() {

        this.movie = null;

    }

    init(container) {

        this.container = container;

    }

    open(movie) {

        if (!movie) {

            return;

        }

        this.movie = movie;

        console.log(

            "🎬 Mini Theatre:",

            movie.title

        );

    }

}

export const miniTheatreController =
    new MiniTheatreController();

    */
"use strict";

import {

    miniTheatreView

}

from "./miniTheatreView.js";

class MiniTheatreController {

    constructor() {

        this.movie = null;

    }

    init(container) {

        miniTheatreView.init(container);

        miniTheatreView.render();

    }

    open(movie) {

        if (!movie) {

            return;

        }

        this.movie = movie;

        console.log(

            "🎬 Mini Theatre",

            movie.title

        );

    }

}

export const miniTheatreController =
    new MiniTheatreController();