"use strict";

import { miniTheatreLayout }

from "./miniTheatreLayout.js";

class MiniTheatreView {

    constructor() {

        this.container = null;

    }

    init(container) {

        this.container = container;

    }

    render() {

        if (!this.container) {

            return;

        }

        this.container.innerHTML =

            miniTheatreLayout();

    }

}

export const miniTheatreView =
    new MiniTheatreView();