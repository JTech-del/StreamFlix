"use strict";

/*======================================
  File:
  src/components/profile/profileView.js

  Description:
  Controls the rendering lifecycle of the
  StreamFlix Profile / Settings view.

  This view coordinates layout rendering
  but does not own business logic.
======================================*/

import {
    createProfileLayout
} from "./profileLayout.js";


export class ProfileView {

    constructor({
        mountElement
    }) {

        if (!(mountElement instanceof HTMLElement)) {

            throw new Error(
                "ProfileView requires a valid mount element."
            );

        }

        this.mountElement = mountElement;

        this.state = {

            mounted: false

        };

    }


    /*==================================
      Mount
    ==================================*/

    mount() {

        if (this.state.mounted) {

            return;

        }

        this.mountElement.innerHTML =
            createProfileLayout();


        this.refreshIcons();


        this.state.mounted = true;

    }


    /*==================================
      Unmount
    ==================================*/

    unmount() {

        this.mountElement.innerHTML = "";


        this.state.mounted = false;

    }


    /*==================================
      Icon Refresh
    ==================================*/

    refreshIcons() {

        if (
            typeof window === "undefined" ||
            !window.lucide ||
            typeof window.lucide.createIcons !== "function"
        ) {

            return;

        }

        window.lucide.createIcons();

    }


    /*==================================
      State
    ==================================*/

    isMounted() {

        return this.state.mounted;

    }


    getMountElement() {

        return this.mountElement;

    }

}