//--------------------------------------
// Internal Imports
//--------------------------------------

import { AppController } from "./controllers/appController.js";

//--------------------------------------
// App
//--------------------------------------

class App {
    constructor() {
        this.appController = new AppController();
    }

    initialize() {
        this.appController.initialize();
    }
}

//--------------------------------------
// Export
//--------------------------------------

export { App };