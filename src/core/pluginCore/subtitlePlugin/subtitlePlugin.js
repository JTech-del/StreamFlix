"use strict";

import {

    subtitleController

} from "./subtitleController.js";

const SubtitlePlugin = Object.freeze({

    name: "Subtitle Plugin",

    version: "1.0.0",

    init(app) {

        console.log(

            `${this.name} initialized`

        );

        subtitleController.init(app);

    },

    destroy() {

        subtitleController.destroy();

        console.log(

            `${this.name} destroyed`

        );

    }

});

export default SubtitlePlugin;