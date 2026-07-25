"use strict";

/*==================================================
    StreamFlix

    File:
    src/app.js

    Responsibility:
    Starts the application.

==================================================*/

import { appController } from "./controllers/appController.js";

export function startApp() {
    console.log("✅ startApp");
    appController.init();

}