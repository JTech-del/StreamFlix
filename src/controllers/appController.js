"use strict";

/*======================================
  File:
  src/controllers/appController.js

  Description:
  Root application controller.

  Responsibilities:
  ✓ Bootstrap the application.
  ✓ Cache root DOM elements.
  ✓ Initialize feature controllers.

======================================*/

import { NavbarController } from "../components/navbar/index.js";

export class AppController {

    constructor() {

        /**
         * Root application elements.
         *
         * @type {{
         *  app: HTMLElement|null,
         *  navbar: HTMLElement|null,
         *  main: HTMLElement|null,
         *  footer: HTMLElement|null
         * }}
         */
        this.elements = {
            app: null,
            navbar: null,
            main: null,
            footer: null
        };

        /**
         * Feature controllers.
         */
        this.controllers = {
            navbar: null
        };

    }

    /**
     * Starts the application.
     */
    init() {

        this.cacheElements();

        this.initializeNavbar();

        console.info("✅ StreamFlix started successfully.");

    }

    /**
     * Cache root DOM elements.
     */
    cacheElements() {

        this.elements.app =
            document.getElementById("app");

        this.elements.navbar =
            document.getElementById("navbar");

        this.elements.main =
            document.getElementById("main-content");

        this.elements.footer =
            document.getElementById("footer");

        this.validateElements();

    }

    /**
     * Validate root elements.
     */
    validateElements() {

        for (const [name, element] of Object.entries(this.elements)) {

            if (!(element instanceof HTMLElement)) {

                throw new Error(
                    `Missing required element: ${name}`
                );

            }

        }

    }

    /**
     * Initialize Navbar.
     */
    initializeNavbar() {

        this.controllers.navbar =
            new NavbarController(
                this.elements.navbar
            );

        this.controllers.navbar.init();

    }

}