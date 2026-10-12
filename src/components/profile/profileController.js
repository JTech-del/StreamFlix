"use strict";

/*======================================
  File:
  src/components/profile/profileController.js

  Description:
  Coordinates interactions for the
  StreamFlix Profile / Settings view.

  This controller owns UI-level behavior
  only. Backend/API integration will be
  added through services later.
======================================*/
import {
    ProfileEditorView
} from "./editor/profileEditorView.js";

import {
    ProfileEditorController
} from "./editor/profileEditorController.js";

import "./editor/profileEditor.css";
export class ProfileController {

    constructor({
        view
    }) {

        if (!view) {

            throw new Error(
                "ProfileController requires a valid view."
            );

        }

        this.view = view;

        this.bound = false;

this.editorView = null;
this.editorController = null;

        this.handleClick =
            this.handleClick.bind(this);

    }


    /*==================================
      Initialize
    ==================================*/

    init() {

        if (this.bound) {

            return;

        }

        this.bindEvents();

        this.bound = true;

    }


    /*==================================
      Event Binding
    ==================================*/

    bindEvents() {

        const mountElement =
            this.view.getMountElement();


        if (!(mountElement instanceof HTMLElement)) {

            return;

        }


        mountElement.addEventListener(
            "click",
            this.handleClick
        );

    }


    /*==================================
      Click Handling
    ==================================*/

    handleClick(event) {

        const actionElement =
            event.target.closest(
                "[data-profile-action]"
            );


        if (!actionElement) {

            return;

        }


        const action =
            actionElement.dataset.profileAction;


        switch (action) {

            case "edit-profile":

                this.handleEditProfile();

                break;


            case "change-password":

                this.handleChangePassword();

                break;


            case "manage-sessions":

                this.handleManageSessions();

                break;


            case "manage-billing":

                this.handleManageBilling();

                break;


            case "cancel-subscription":

                this.handleCancelSubscription();

                break;


            case "delete-account":

                this.handleDeleteAccount();

                break;


            case "coming-soon":

                this.handleComingSoon();

                break;


            default:

                console.warn(
                    `Unknown profile action: ${action}`
                );

        }

    }


    /*==================================
      Actions
    ==================================*/

handleEditProfile() {

    console.log("Profile → Edit Profile");

    const mountElement =
        this.view.getMountElement();

    if (!(mountElement instanceof HTMLElement)) {
        return;
    }

    if (!this.editorView) {

        this.editorView =
            new ProfileEditorView({
                mountElement
            });

        this.editorController =
            new ProfileEditorController({
                view: this.editorView,

                onCancel: () => {
                    this.closeProfileEditor();
                },

                onSave: (profile) => {
                    this.handleProfileSave(profile);
                }
            });

        this.editorController.init();

    }

    this.editorView.mount();

}


    handleChangePassword() {

        console.log(
            "Profile → Change Password"
        );

    }


    handleManageSessions() {

        console.log(
            "Profile → Active Sessions & Devices"
        );

    }


    handleManageBilling() {

        console.log(
            "Profile → Manage Billing"
        );

    }


    handleCancelSubscription() {

        console.log(
            "Profile → Cancel Subscription"
        );

    }


    handleDeleteAccount() {

        console.log(
            "Profile → Delete Account"
        );

    }


    handleComingSoon() {

        console.log(
            "Profile → Feature coming soon"
        );

    }


closeProfileEditor() {

    if (this.editorController) {
        this.editorController.destroy();
        this.editorController = null;
    }

    if (this.editorView) {
        this.editorView.unmount();
        this.editorView = null;
    }

    this.view.mount();

}

handleProfileSave(profile) {

    console.log(
        "Profile → Save requested:",
        profile
    );

    if (this.editorView) {

        const mountElement =
            this.editorView.getMountElement();

        const status =
            mountElement.querySelector(
                "[data-profile-editor-status]"
            );

        if (status) {

            status.textContent =
                "Changes are ready for the profile API integration.";

        }

    }

}

    /*==================================
      Destroy
    ==================================*/

    destroy() {

        const mountElement =
            this.view.getMountElement();


        if (mountElement instanceof HTMLElement) {

            mountElement.removeEventListener(
                "click",
                this.handleClick
            );

        }


        this.bound = false;

    }

}