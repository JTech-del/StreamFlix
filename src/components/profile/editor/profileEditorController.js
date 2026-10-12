"use strict";

export class ProfileEditorController {

    constructor({ view, onCancel, onSave }) {

        if (!view) {
            throw new Error(
                "ProfileEditorController requires a valid view."
            );
        }

        this.view = view;

        this.onCancel =
            typeof onCancel === "function"
                ? onCancel
                : () => {};

        this.onSave =
            typeof onSave === "function"
                ? onSave
                : () => {};

        this.bound = false;

        this.handleClick =
            this.handleClick.bind(this);

        this.handleSubmit =
            this.handleSubmit.bind(this);

        this.handleInput =
            this.handleInput.bind(this);

    }

    init() {

        if (this.bound) {
            return;
        }

        const mountElement =
            this.view.getMountElement();

        if (!(mountElement instanceof HTMLElement)) {
            return;
        }

        mountElement.addEventListener(
            "click",
            this.handleClick
        );

        mountElement.addEventListener(
            "submit",
            this.handleSubmit
        );

        mountElement.addEventListener(
            "input",
            this.handleInput
        );

        this.bound = true;

        this.updateBioCounter();

    }

    handleClick(event) {

        const actionElement =
            event.target.closest(
                "[data-profile-editor-action]"
            );

        if (!actionElement) {
            return;
        }

        const action =
            actionElement.dataset
                .profileEditorAction;

        switch (action) {

            case "cancel":
                this.onCancel();
                break;

            case "save":
                break;

            default:
                console.warn(
                    `Unknown profile editor action: ${action}`
                );

        }

    }

    handleSubmit(event) {

        event.preventDefault();

        const form =
            event.target.closest(
                "[data-profile-editor-form]"
            );

        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        const profile =
            this.collectFormData(form);

        const validation =
            this.validate(profile);

        this.clearErrors();

        if (!validation.valid) {

            this.showValidationErrors(
                validation.errors
            );

            this.showStatus(
                "Please correct the highlighted fields."
            );

            return;

        }

        this.showStatus(
            "Profile changes are ready to be saved."
        );

        this.onSave(profile);

    }

    handleInput(event) {

        const field =
            event.target.closest(
                "[name]"
            );

        if (!field) {
            return;
        }

        if (field.name === "bio") {

            this.updateBioCounter();

        }

        this.clearFieldError(
            field.name
        );

    }

    collectFormData(form) {

        const formData =
            new FormData(form);

        return {
            displayName:
                String(
                    formData.get("displayName") || ""
                ).trim(),

            username:
                String(
                    formData.get("username") || ""
                ).trim(),

            bio:
                String(
                    formData.get("bio") || ""
                ).trim()
        };

    }

    validate(profile) {

        const errors = {};

        if (!profile.displayName) {

            errors.displayName =
                "Display name is required.";

        } else if (
            profile.displayName.length < 2
        ) {

            errors.displayName =
                "Display name must be at least 2 characters.";

        } else if (
            profile.displayName.length > 80
        ) {

            errors.displayName =
                "Display name cannot exceed 80 characters.";

        }

        if (!profile.username) {

            errors.username =
                "Username is required.";

        } else if (
            !/^[a-zA-Z0-9_-]{3,30}$/.test(
                profile.username
            )
        ) {

            errors.username =
                "Username must contain 3–30 letters, numbers, underscores, or hyphens.";

        }

        if (
            profile.bio.length > 240
        ) {

            errors.bio =
                "Bio cannot exceed 240 characters.";

        }

        return {
            valid:
                Object.keys(errors).length === 0,

            errors
        };

    }

    showValidationErrors(errors) {

        Object.entries(errors)
            .forEach(
                ([field, message]) => {

                    const errorElement =
                        this.view
                            .getMountElement()
                            .querySelector(
                                `[data-profile-editor-error="${field}"]`
                            );

                    if (!errorElement) {
                        return;
                    }

                    errorElement.textContent =
                        message;

                    const input =
                        this.view
                            .getMountElement()
                            .querySelector(
                                `[name="${field}"]`
                            );

                    if (input) {

                        input.setAttribute(
                            "aria-invalid",
                            "true"
                        );

                    }

                }
            );

    }

    clearErrors() {

        const mountElement =
            this.view.getMountElement();

        mountElement
            .querySelectorAll(
                "[data-profile-editor-error]"
            )
            .forEach(
                (element) => {

                    element.textContent = "";

                }
            );

        mountElement
            .querySelectorAll(
                "[aria-invalid=\"true\"]"
            )
            .forEach(
                (element) => {

                    element.removeAttribute(
                        "aria-invalid"
                    );

                }
            );

    }

    clearFieldError(fieldName) {

        if (!fieldName) {
            return;
        }

        const mountElement =
            this.view.getMountElement();

        const errorElement =
            mountElement.querySelector(
                `[data-profile-editor-error="${fieldName}"]`
            );

        if (errorElement) {

            errorElement.textContent = "";

        }

        const field =
            mountElement.querySelector(
                `[name="${fieldName}"]`
            );

        if (field) {

            field.removeAttribute(
                "aria-invalid"
            );

        }

    }

    updateBioCounter() {

        const mountElement =
            this.view.getMountElement();

        const bio =
            mountElement.querySelector(
                '[name="bio"]'
            );

        const counter =
            mountElement.querySelector(
                '[data-profile-editor-counter="bio"]'
            );

        if (!bio || !counter) {
            return;
        }

        counter.textContent =
            `${bio.value.length}/240`;

    }

    showStatus(message) {

        const status =
            this.view
                .getMountElement()
                .querySelector(
                    "[data-profile-editor-status]"
                );

        if (!status) {
            return;
        }

        status.textContent =
            message;

    }

    destroy() {

        const mountElement =
            this.view.getMountElement();

        if (
            mountElement instanceof HTMLElement
        ) {

            mountElement.removeEventListener(
                "click",
                this.handleClick
            );

            mountElement.removeEventListener(
                "submit",
                this.handleSubmit
            );

            mountElement.removeEventListener(
                "input",
                this.handleInput
            );

        }

        this.bound = false;

    }

}