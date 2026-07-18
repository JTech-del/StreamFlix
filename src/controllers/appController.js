//--------------------------------------
// App Controller
//--------------------------------------
import { createHomeLayout } from "../layouts/home/homeLayout.js";
import { HomeView } from "../views/home/homeView.js";




//--------------------------------------
// App Controller
//--------------------------------------

class AppController {
    constructor() {
        this.appRoot = null;
        this.homeView = new HomeView();
    }

    initialize() {
        this.cacheDOMElements();
        this.renderApplication();
    }

    //--------------------------------------
    // Cache DOM Elements
    //--------------------------------------

    cacheDOMElements() {
        this.appRoot = document.querySelector("#app");

        if (!this.appRoot) {
            throw new Error("Application root (#app) was not found.");
        }
    }

    //--------------------------------------
    // Render Application
    //--------------------------------------
    renderApplication() {
        this.appRoot.innerHTML = this.homeView.render();
    }
}

//--------------------------------------
// Export
//--------------------------------------

export { AppController };