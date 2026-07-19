"use strict";

/*======================================
  File:
  src/components/navbar/navbarController.js

  Description:
  Controls all navbar interactions.

======================================*/

import { NavbarView } from "./navbarView.js";

export class NavbarController {

    constructor(rootElement) {

        if (!(rootElement instanceof HTMLElement)) {
            throw new Error(
                "NavbarController requires a valid HTMLElement."
            );
        }

        this.rootElement = rootElement;

        this.view = new NavbarView(rootElement);

        this.elements = {
            navbar: null,
            navigation: null,
            menu: null,
            actions: null,
            mobileButton: null,
            navLinks: []
        };

        this.state = {
            mobileMenuOpen: false,
            activeRoute: "home"
        };

        this.handleMobileToggle = this.handleMobileToggle.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleNavigationClick = this.handleNavigationClick.bind(this);

    }

    init() {

        this.render();

        this.cacheElements();

        this.bindEvents();

    }

    render() {

        this.view.render();

        this.renderIcons();

    }

    cacheElements() {

        this.elements.navbar =
            this.rootElement.querySelector(".navbar");

        this.elements.navigation =
            this.rootElement.querySelector(".navbar__navigation");

        this.elements.menu =
            this.rootElement.querySelector(".navbar__menu");

        this.elements.actions =
            this.rootElement.querySelector(".navbar__actions");

        this.elements.mobileButton =
            this.rootElement.querySelector('[data-action="menu"]');

        this.elements.navLinks = [
            ...this.rootElement.querySelectorAll(".navbar__link")
        ];

    }

    bindEvents() {

        if (this.elements.mobileButton) {

            this.elements.mobileButton.addEventListener(
                "click",
                this.handleMobileToggle
            );

        }

        if (this.elements.menu) {

            this.elements.menu.addEventListener(
                "click",
                this.handleNavigationClick
            );

        }

        document.addEventListener(
            "click",
            this.handleDocumentClick
        );

        document.addEventListener(
            "keydown",
            this.handleKeyDown
        );

    }

    handleNavigationClick(event) {

        const link = event.target.closest(".navbar__link");

        if (!link) return;

        this.setActiveNavigation(link.dataset.route);

        this.closeMobileMenu();

    }

    setActiveNavigation(route) {

        this.state.activeRoute = route;

        this.elements.navLinks.forEach(link => {

            link.classList.toggle(
                "is-active",
                link.dataset.route === route
            );

        });

    }

    handleMobileToggle(event) {

        event.stopPropagation();

        this.state.mobileMenuOpen = !this.state.mobileMenuOpen;

        this.updateMobileMenu();

    }

    updateMobileMenu() {

        const isOpen = this.state.mobileMenuOpen;

        this.elements.navigation.classList.toggle(
            "is-open",
            isOpen
        );

        this.elements.mobileButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        this.updateMobileToggleIcon();

    }

    updateMobileToggleIcon() {
        if (!this.elements.mobileButton) return;

        const icon = this.elements.mobileButton.querySelector("i");
        if (!icon) return;

        icon.setAttribute(
            "data-lucide",
            this.state.mobileMenuOpen ? "x" : "menu"
        );

        this.renderIcons();

    }


    handleDocumentClick(event) {

        if (!this.state.mobileMenuOpen) return;

        if (this.elements.navbar.contains(event.target)) return;

        this.closeMobileMenu();

    }

    handleKeyDown(event) {

        if (event.key === "Escape") {

            this.closeMobileMenu();

        }

    }

    closeMobileMenu() {

        this.state.mobileMenuOpen = false;

        this.updateMobileMenu();

    }

    renderIcons() {

        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {

            window.lucide.createIcons();

        }

    }

    destroy() {

        this.view.destroy();

    }

}