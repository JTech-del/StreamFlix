"use strict";

/*======================================
  File: src/main.js

  Description:
  Application entry point.

  Responsibilities:
  ✓ Wait for the DOM to be ready.
  ✓ Start the application.

  Does NOT:
  ✗ Render UI
  ✗ Handle state
  ✗ Access APIs
======================================*/

import { startApp } from "./app.js";

/**
 * Bootstraps the application once the DOM
 * has finished loading.
 */
function bootstrap() {
    startApp();
}

// Start immediately if the DOM is already loaded.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}