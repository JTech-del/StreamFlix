"use strict";

export class ApplicationViewController {

    constructor({
        homeElement,
        applicationElement
    }) {

        if (!(homeElement instanceof HTMLElement)) {
            throw new Error(
                "ApplicationViewController requires a valid home element."
            );
        }

        if (!(applicationElement instanceof HTMLElement)) {
            throw new Error(
                "ApplicationViewController requires a valid application element."
            );
        }

        this.elements = {
            home: homeElement,
            application: applicationElement
        };

        this.state = {
            activeView: "home"
        };

    }

    init() {
        this.showHome();
    }

    showHome() {

        this.elements.home.hidden = false;
        this.elements.application.hidden = true;

        this.state.activeView = "home";

    }

    showApplicationView() {

        this.elements.home.hidden = true;
        this.elements.application.hidden = false;

        this.state.activeView = "application";

    }

    showView(viewName, renderCallback) {

        if (typeof viewName !== "string" || !viewName.trim()) {

            console.warn(
                "ApplicationViewController → invalid view name."
            );

            return;

        }

        if (typeof renderCallback !== "function") {

            console.warn(
                `ApplicationViewController → no renderer provided for "${viewName}".`
            );

            return;

        }

        this.showApplicationView();

        renderCallback(this.elements.application);

        this.state.activeView = viewName;

    }

    getActiveView() {

        return this.state.activeView;

    }

}