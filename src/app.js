"use strict";

/*======================================
  File: src/app.js

  Description:
  Application bootstrap.

  Responsibilities:
  ✓ Create the application controller.
  ✓ Start the application.

  Does NOT:
  ✗ Render UI directly.
  ✗ Handle business logic.
======================================*/

import { AppController } from "./controllers/appController.js";

/**
 * Starts the StreamFlix application.
 *
 * @returns {void}
 */
export function startApp() {
    const app = new AppController();

    app.init();
}