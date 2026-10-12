"use strict";

import {
    createProfileEditorLayout
} from "./profileEditorLayout.js";

export class ProfileEditorView {

    constructor({
        mountElement,
        profile = {}
    }) {

        if (!(mountElement instanceof HTMLElement)) {
            throw new Error(
                "ProfileEditorView requires a valid mount element."
            );
        }

        this.mountElement = mountElement;

        this.state = {
            mounted: false,
            profile: {
                displayName:
                    profile.displayName ||
                    "Godfrey Emmanuel",

                username:
                    profile.username ||
                    "godfrey",

                bio:
                    profile.bio ||
                    "Frontend Developer"
            }
        };

    }

    mount() {

        this.mountElement.innerHTML =
            createProfileEditorLayout({
                profile: this.state.profile
            });

        this.refreshIcons();

        this.state.mounted = true;

    }

    unmount() {

        this.mountElement.innerHTML = "";

        this.state.mounted = false;

    }

    updateProfile(profile = {}) {

        this.state.profile = {
            ...this.state.profile,
            ...profile
        };

    }

    getProfile() {

        return {
            ...this.state.profile
        };

    }

    getMountElement() {

        return this.mountElement;

    }

    isMounted() {

        return this.state.mounted;

    }

    refreshIcons() {

        if (
            typeof window === "undefined" ||
            !window.lucide ||
            typeof window.lucide.createIcons !==
                "function"
        ) {
            return;
        }

        window.lucide.createIcons();

    }

}