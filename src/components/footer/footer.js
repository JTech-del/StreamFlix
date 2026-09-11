"use strict";

/*==================================================
    StreamFlix Footer Controller

    Responsibility:

    ✓ Initialize Footer
    ✓ Render Footer
    ✓ Initialize Lucide icons
    ✓ Manage Footer lifecycle

    Does NOT handle:

    ✗ Footer data
    ✗ Navigation business logic
    ✗ Application state
    ✗ API calls
==================================================*/


import {
    footerLayout
} from "./footerLayout.js";


/*==================================================
    Footer Controller
==================================================*/

class FooterController {


    constructor() {


        /*==========================================
            DOM Reference
        ==========================================*/

        this.container = null;


        /*==========================================
            State
        ==========================================*/

        this.initialized = false;

    }


    /*==================================================
        Initialize
    ==================================================*/

    init(container) {


        if (!container) {

            console.error(
                "Footer mount point not found."
            );

            return;

        }


        this.container =
            container;


        /*==========================================
            Render Footer
        ==========================================*/

        this.render();


        /*==========================================
            Lifecycle
        ==========================================*/

        this.initialized = true;


        console.log(
            "StreamFlix Footer initialized."
        );

    }


    /*==================================================
        Render
    ==================================================*/

    render() {


        if (!this.container) {

            console.error(
                "Footer container not available."
            );

            return;

        }


        /*==========================================
            Inject Footer Layout
        ==========================================*/

        this.container.innerHTML =
            footerLayout();


        /*==========================================
            Initialize Lucide
        ==========================================*/

        this.initializeIcons();

    }


    /*==================================================
        Initialize Lucide Icons
    ==================================================*/

    initializeIcons() {


        if (
            typeof window === "undefined"
        ) {

            return;

        }


        if (!window.lucide) {

            console.warn(
                "Lucide is not available."
            );

            return;

        }


        if (
            typeof window.lucide.createIcons !==
            "function"
        ) {

            console.warn(
                "Lucide createIcons() is not available."
            );

            return;

        }


        /*
            Convert:

                <i data-lucide="instagram"></i>

            into the corresponding:

                <svg></svg>

            after the footer has been
            injected into the DOM.
        */

        window.lucide.createIcons({

            attrs: {

                "aria-hidden": "true",

                focusable: "false"

            }

        });


    }


    /*==================================================
        Re-render
    ==================================================*/

    refresh() {


        if (!this.container) {

            return;

        }


        this.render();

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {


        if (!this.container) {

            return;

        }


        this.container.innerHTML = "";


        this.container = null;

        this.initialized = false;


    }

}


/*==================================================
    Singleton
==================================================*/

export const footerController =
    new FooterController();


/*==================================================
    Public Export
==================================================*/

export {

    FooterController

};


export default footerController;