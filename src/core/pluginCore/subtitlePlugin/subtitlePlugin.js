"use strict";

const SubtitlePlugin = {

    name: "Subtitle Plugin",

    version: "1.0.0",

    app: null,

    init(app) {

        this.app = app;

        console.log(

            `${this.name} initialized`

        );

    },

    destroy() {

        this.app = null;

        console.log(

            `${this.name} destroyed`

        );

    }

};

export default Object.freeze(SubtitlePlugin);