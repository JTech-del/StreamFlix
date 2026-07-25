"use strict";

/*==================================================
    StreamFlix

    File:
    src/main.js

    Responsibility:
    Application entry point.

==================================================*/

import { startApp } from "./app.js";

function bootstrap() {

    startApp();

}

if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", bootstrap);

} else {

    bootstrap();

}