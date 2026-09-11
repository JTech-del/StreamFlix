"use strict";

/*==================================================
StreamFlix Media Rail Controller

Responsibility:

✓ Initialize Media Rail
✓ Render movie items
✓ Initialize Lucide icons
✓ Keyboard navigation
✓ Previous / Next navigation
✓ Mouse / pointer interaction
✓ Mobile swipe navigation
✓ Active card management
✓ Active card scrolling
✓ Theatre action
✓ Download action
✓ My List action
✓ Emit MediaRail events

Does NOT handle:

✗ Hero state
✗ Hero updates
✗ Mini Theatre playback logic
✗ Movie business logic

==================================================*/

import {
    mediaRailEvents
} from "./mediaRailEvents.js";

import {
    MediaRailEventTypes
} from "./mediaRailEventTypes.js";

import {
    mediaRailLayout
} from "./mediaRailLayout.js";

import {
    mediaRailTemplates
} from "./mediaRailTemplates.js";


class MediaRailController {


    constructor() {


        /*==========================================
            DOM References
        ==========================================*/

        this.container = null;

        this.track = null;

        this.viewport = null;

        this.previousButton = null;

        this.nextButton = null;


        /*==========================================
            Movie State
        ==========================================*/

        this.items = [];

        this.itemElements = [];

        this.currentIndex = 0;

        this.currentMovie = null;


        /*==========================================
            Rail Identity
        ==========================================*/

        this.id = null;

        this.title = "More Movies";

        this.ariaLabel = "More movies";


        /*==========================================
            Rail Configuration
        ==========================================*/

        this.template = "item";

        this.loop = true;

        this.keyboard = true;

        this.swipe = true;

        this.visibleItems = 6;


        /*==========================================
            Touch State
        ==========================================*/

        this.touchStartX = 0;

        this.touchEndX = 0;

        this.touchStartY = 0;

        this.touchEndY = 0;


        /*==========================================
            Pointer State
        ==========================================*/

        this.isPointerDown = false;


        /*==========================================
            Lifecycle
        ==========================================*/

        this.initialized = false;


        /*==========================================
            Bound Handlers
        ==========================================*/

        this.boundHandleClick =
            this.handleClick.bind(this);

        this.boundHandlePrevious =
            this.handlePrevious.bind(this);

        this.boundHandleNext =
            this.handleNext.bind(this);

        this.boundHandleKeyboard =
            this.handleKeyboard.bind(this);

        this.boundHandleTouchStart =
            this.handleTouchStart.bind(this);

        this.boundHandleTouchEnd =
            this.handleTouchEnd.bind(this);

        this.boundHandlePointerDown =
            this.handlePointerDown.bind(this);

        this.boundHandlePointerUp =
            this.handlePointerUp.bind(this);

    }


    /*==================================================
        Initialize
    ==================================================*/

    init({

        container,

        items = [],

        template = "item",

        title = "More Movies",

        ariaLabel = "More movies",

        loop = true,

        keyboard = true,

        swipe = true,

        visibleItems = 6

    } = {}) {


        if (!container) {

            console.error(
                "Media Rail container not found."
            );

            return;

        }


        /*==========================================
            Store Configuration
        ==========================================*/

        this.container =
            container;

        this.items =
            Array.isArray(items) ?
            items :
            [];

        this.template =
            template;

        this.title =
            title;

        this.ariaLabel =
            ariaLabel;

        this.loop =
            loop;

        this.keyboard =
            keyboard;

        this.swipe =
            swipe;

        this.visibleItems =
            visibleItems;


        /*==========================================
            Render Layout
        ==========================================*/

        this.container.innerHTML =
            mediaRailLayout({

                title: this.title,

                ariaLabel: this.ariaLabel

            });


        /*==========================================
            Cache Elements
        ==========================================*/

        this.cacheElements();


        /*==========================================
            Bind Events
        ==========================================*/

        this.bindEvents();


        /*==========================================
            Render Movies
        ==========================================*/

        this.render();


        this.initialized = true;


        /*==========================================
            Lifecycle Event
        ==========================================*/

        mediaRailEvents.emit(

            MediaRailEventTypes.INITIALIZED,

            {

                controller: this

            }

        );

    }


    /*==================================================
        Cache Elements
    ==================================================*/

    cacheElements() {

        if (!this.container) {

            return;

        }


        this.track =
            this.container.querySelector(
                ".mediaRail__track"
            );


        this.viewport =
            this.container.querySelector(
                ".mediaRail__viewport"
            );


        this.previousButton =
            this.container.querySelector(
                '[data-rail-action="previous"]'
            );


        this.nextButton =
            this.container.querySelector(
                '[data-rail-action="next"]'
            );

    }


    /*==================================================
        Render
    ==================================================*/

    render() {

        if (!this.container) {

            return;

        }


        if (!this.track) {

            this.cacheElements();

        }


        if (!this.track) {

            console.error(
                "Media Rail track not found."
            );

            return;

        }


        /*==========================================
            Clear Existing Cards
        ==========================================*/

        this.track.innerHTML = "";


        /*==========================================
            Resolve Template
        ==========================================*/

        const template =
            mediaRailTemplates[
                this.template
            ];


        if (
            typeof template !==
            "function"
        ) {

            console.error(

                `Media Rail template "${this.template}" not found.`

            );

            return;

        }


        /*==========================================
            Render Movie Cards
        ==========================================*/

        this.items.forEach(

            (movie, index) => {

                this.track.insertAdjacentHTML(

                    "beforeend",

                    template(
                        movie,
                        index
                    )

                );

            }

        );


        /*==========================================
            Refresh Item References
        ==========================================*/

        this.refreshItems();


        /*==========================================
            IMPORTANT:
            Convert data-lucide elements into SVG
        ==========================================*/

        this.refreshIcons();


        /*==========================================
            Reset State
        ==========================================*/

        this.currentIndex = 0;

        this.currentMovie =
            this.items[0] || null;


        /*==========================================
            Refresh Active State
        ==========================================*/

        this.updateActiveState();

        this.updateNavigation();


        /*==========================================
            Emit Render Event
        ==========================================*/

        mediaRailEvents.emit(

            MediaRailEventTypes.RENDERED,

            {

                controller: this,

                items: this.items

            }

        );

    }


    /*==================================================
        Refresh Items
    ==================================================*/

    refreshItems() {

        if (!this.track) {

            return;

        }


        this.itemElements =
            Array.from(

                this.track.querySelectorAll(
                    ".mediaRail__item"
                )

            );

    }


    /*==================================================
        Refresh Lucide Icons
    ==================================================*/

    refreshIcons() {

        if (
            typeof window === "undefined"
        ) {

            return;

        }


        if (!window.lucide) {

            console.warn(
                "Lucide is not available."
            );

            return;

        }


        if (
            typeof window.lucide.createIcons !==
            "function"
        ) {

            console.warn(
                "Lucide createIcons() is not available."
            );

            return;

        }


        /*
            The movie markup has now been inserted
            into the DOM.

            Lucide can safely convert:

            <i data-lucide="tv"></i>

            into:

            <svg>...</svg>
        */

        window.lucide.createIcons({

            attrs: {

                "aria-hidden": "true"

            }

        });

    }


    /*==================================================
        Bind Events
    ==================================================*/

    bindEvents() {

        if (!this.container) {

            return;

        }


        /*==========================================
            Card Click
        ==========================================*/

        this.container.addEventListener(

            "click",

            this.boundHandleClick

        );


        /*==========================================
            Previous
        ==========================================*/

        if (this.previousButton) {

            this.previousButton.addEventListener(

                "click",

                this.boundHandlePrevious

            );

        }


        /*==========================================
            Next
        ==========================================*/

        if (this.nextButton) {

            this.nextButton.addEventListener(

                "click",

                this.boundHandleNext

            );

        }


        /*==========================================
            Keyboard
        ==========================================*/

        if (this.keyboard) {

            this.container.addEventListener(

                "keydown",

                this.boundHandleKeyboard

            );

        }


        /*==========================================
            Touch
        ==========================================*/

        if (
            this.swipe &&
            this.track
        ) {

            this.track.addEventListener(

                "touchstart",

                this.boundHandleTouchStart,

                {
                    passive: true
                }

            );


            this.track.addEventListener(

                "touchend",

                this.boundHandleTouchEnd,

                {
                    passive: true
                }

            );

        }


        /*==========================================
            Pointer
        ==========================================*/

        this.container.addEventListener(

            "pointerdown",

            this.boundHandlePointerDown

        );


        this.container.addEventListener(

            "pointerup",

            this.boundHandlePointerUp

        );

    }


    /*==================================================
        Pointer Down
    ==================================================*/

    handlePointerDown() {

        this.isPointerDown =
            true;

    }


    /*==================================================
        Pointer Up
    ==================================================*/

    handlePointerUp() {

        requestAnimationFrame(() => {

            this.isPointerDown =
                false;

        });

    }


    /*==================================================
        Click
    ==================================================*/

    handleClick(event) {

        const theatreButton =
            event.target.closest(
                '[data-action="theatre"]'
            );


        const downloadButton =
            event.target.closest(
                '[data-action="download"]'
            );


        const myListButton =
            event.target.closest(
                '[data-action="my-list"]'
            );


        const item =
            event.target.closest(
                ".mediaRail__item"
            );


        if (!item) {

            return;

        }


        const index =
            Number(
                item.dataset.index
            );


        if (
            Number.isNaN(index)
        ) {

            return;

        }


        /*==========================================
            Theatre
        ==========================================*/

        if (theatreButton) {

            event.preventDefault();

            event.stopPropagation();


            this.setActiveIndex(
                index
            );


            this.emitTheatre(
                index
            );


            return;

        }


        /*==========================================
            Download
        ==========================================*/

        if (downloadButton) {

            event.preventDefault();

            event.stopPropagation();


            this.setActiveIndex(
                index
            );


            this.emitDownload(
                index
            );


            return;

        }


        /*==========================================
            My List
        ==========================================*/

        if (myListButton) {

            event.preventDefault();

            event.stopPropagation();


            this.setActiveIndex(
                index
            );


            this.emitMyList(
                index
            );


            return;

        }


        /*==========================================
            Card Activation
        ==========================================*/

        this.setActiveIndex(
            index
        );


        mediaRailEvents.emit(

            MediaRailEventTypes.ITEM_ACTIVATED,

            {

                item: this.items[index],

                index,

                controller: this

            }

        );

    }


    /*==================================================
        Previous Button
    ==================================================*/

    handlePrevious(event) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();

        }


        this.showPrevious();

    }


    /*==================================================
        Next Button
    ==================================================*/

    handleNext(event) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();

        }


        this.showNext();

    }


    /*==================================================
        Show Previous
    ==================================================*/

    showPrevious() {

        if (!this.items.length) {

            return;

        }


        let newIndex;


        if (
            this.currentIndex <= 0
        ) {

            if (!this.loop) {

                return;

            }


            newIndex =
                this.items.length - 1;

        } else {

            newIndex =
                this.currentIndex - 1;

        }


        this.setActiveIndex(
            newIndex,
            true
        );


        mediaRailEvents.emit(

            MediaRailEventTypes.PREVIOUS,

            {

                item: this.currentMovie,

                index: this.currentIndex,

                controller: this

            }

        );

    }


    /*==================================================
        Show Next
    ==================================================*/

    showNext() {

        if (!this.items.length) {

            return;

        }


        let newIndex;


        if (
            this.currentIndex >=
            this.items.length - 1
        ) {

            if (!this.loop) {

                return;

            }


            newIndex = 0;

        } else {

            newIndex =
                this.currentIndex + 1;

        }


        this.setActiveIndex(
            newIndex,
            true
        );


        mediaRailEvents.emit(

            MediaRailEventTypes.NEXT,

            {

                item: this.currentMovie,

                index: this.currentIndex,

                controller: this

            }

        );

    }


    /*==================================================
        Set Active Index
    ==================================================*/

    setActiveIndex(

        index,

        shouldScroll = true

    ) {

        if (!this.items.length) {

            return;

        }


        if (
            index < 0 ||
            index >= this.items.length
        ) {

            return;

        }


        this.currentIndex =
            index;


        this.currentMovie =
            this.items[index];


        this.updateActiveState();


        if (shouldScroll) {

            this.scrollActiveIntoView();

        }


        this.updateNavigation();


        mediaRailEvents.emit(

            MediaRailEventTypes.ITEM_CHANGED,

            {

                item: this.currentMovie,

                index,

                controller: this

            }

        );


        mediaRailEvents.emit(

            MediaRailEventTypes.ITEM_FOCUSED,

            {

                item: this.currentMovie,

                index,

                controller: this

            }

        );

    }


    /*==================================================
        Update Active State
    ==================================================*/

    updateActiveState() {

        if (!this.itemElements) {

            return;

        }


        this.itemElements.forEach(

            (item, index) => {

                const isActive =
                    index ===
                    this.currentIndex;


                item.classList.toggle(

                    "is-active",

                    isActive

                );


                item.setAttribute(

                    "aria-selected",

                    String(isActive)

                );


                if (isActive) {

                    item.setAttribute(

                        "data-active",

                        "true"

                    );

                } else {

                    item.removeAttribute(

                        "data-active"

                    );

                }

            }

        );

    }


    /*==================================================
        Scroll Active Card Into View
    ==================================================*/

    scrollActiveIntoView() {

        if (!this.itemElements) {

            return;

        }


        const activeItem =
            this.itemElements[
                this.currentIndex
            ];


        if (!activeItem) {

            return;

        }


        activeItem.scrollIntoView({

            behavior: "smooth",

            block: "nearest",

            inline: "center"

        });

    }


    /*==================================================
        Keyboard Navigation
    ==================================================*/

    handleKeyboard(event) {

        const target =
            event.target;


        if (
            target &&
            (
                target.matches(
                    "input, textarea, select"
                ) ||
                target.isContentEditable
            )
        ) {

            return;

        }


        switch (event.key) {

            case "ArrowLeft":

                event.preventDefault();

                event.stopPropagation();

                this.showPrevious();

                break;


            case "ArrowRight":

                event.preventDefault();

                event.stopPropagation();

                this.showNext();

                break;


            case "Enter":

                event.preventDefault();

                event.stopPropagation();

                this.emitTheatre(
                    this.currentIndex
                );

                break;


            case " ":

            case "Space":

            case "Spacebar":

                event.preventDefault();

                event.stopPropagation();

                this.emitTheatre(
                    this.currentIndex
                );

                break;


            case "Escape":

                event.preventDefault();

                this.clearActiveState();

                break;

        }

    }


    /*==================================================
        Clear Active State
    ==================================================*/

    clearActiveState() {

        if (!this.itemElements) {

            return;

        }


        this.itemElements.forEach(

            item => {

                item.classList.remove(
                    "is-active"
                );


                item.removeAttribute(
                    "data-active"
                );


                item.setAttribute(
                    "aria-selected",
                    "false"
                );

            }

        );

    }


    /*==================================================
        Touch Start
    ==================================================*/

    handleTouchStart(event) {

        if (!event.changedTouches ||
            !event.changedTouches.length
        ) {

            return;

        }


        const touch =
            event.changedTouches[0];


        this.touchStartX =
            touch.clientX;


        this.touchStartY =
            touch.clientY;

    }


    /*==================================================
        Touch End
    ==================================================*/

    handleTouchEnd(event) {

        if (!event.changedTouches ||
            !event.changedTouches.length
        ) {

            return;

        }


        const touch =
            event.changedTouches[0];


        this.touchEndX =
            touch.clientX;


        this.touchEndY =
            touch.clientY;


        this.detectSwipe();

    }


    /*==================================================
        Detect Swipe
    ==================================================*/

    detectSwipe() {

        const distanceX =
            this.touchStartX -
            this.touchEndX;


        const distanceY =
            this.touchStartY -
            this.touchEndY;


        const threshold =
            50;


        if (
            Math.abs(distanceX) <
            Math.abs(distanceY)
        ) {

            return;

        }


        if (
            Math.abs(distanceX) <
            threshold
        ) {

            return;

        }


        if (distanceX > 0) {

            this.showNext();

        } else {

            this.showPrevious();

        }

    }


    /*==================================================
        Theatre
    ==================================================*/

    emitTheatre(index) {

        const movie =
            this.items[index];


        if (!movie) {

            return;

        }


        this.setActiveIndex(
            index,
            true
        );


        mediaRailEvents.emit(

            MediaRailEventTypes.THEATRE,

            {

                item: movie,

                index,

                controller: this

            }

        );

    }


    /*==================================================
        Download
    ==================================================*/

    emitDownload(index) {

        const movie =
            this.items[index];


        if (!movie) {

            return;

        }


        mediaRailEvents.emit(

            MediaRailEventTypes.DOWNLOAD,

            {

                item: movie,

                index,

                controller: this

            }

        );

    }


    /*==================================================
        My List
    ==================================================*/

    emitMyList(index) {

        const movie =
            this.items[index];


        if (!movie) {

            return;

        }


        mediaRailEvents.emit(

            MediaRailEventTypes.MY_LIST,

            {

                item: movie,

                index,

                controller: this

            }

        );

    }


    /*==================================================
        Get Current Movie
    ==================================================*/

    getCurrentMovie() {

        return this.currentMovie;

    }


    /*==================================================
        Get Current Index
    ==================================================*/

    getCurrentIndex() {

        return this.currentIndex;

    }


    /*==================================================
        Get Movies
    ==================================================*/

    getMovies() {

        return this.items;

    }


    /*==================================================
        Set Movies
    ==================================================*/

    setMovies(items = []) {

        this.items =
            Array.isArray(items) ?
            items :
            [];


        this.currentIndex =
            0;


        this.currentMovie =
            this.items[0] || null;


        this.render();

    }


    /*==================================================
        Set Rail Title
    ==================================================*/

    setTitle(
        title = "More Movies"
    ) {

        this.title =
            title ||
            "More Movies";


        if (!this.container) {

            return;

        }


        const titleElement =
            this.container.querySelector(
                ".mediaRail__heading"
            );


        if (titleElement) {

            titleElement.textContent =
                this.title;

        }

    }


    /*==================================================
        Update Navigation
    ==================================================*/

    updateNavigation() {

        if (!this.previousButton ||
            !this.nextButton
        ) {

            return;

        }


        if (this.loop) {

            this.previousButton.disabled =
                this.items.length <= 1;


            this.nextButton.disabled =
                this.items.length <= 1;


            return;

        }


        this.previousButton.disabled =
            this.currentIndex <= 0;


        this.nextButton.disabled =
            this.currentIndex >=
            this.items.length - 1;

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        if (!this.container) {

            return;

        }


        this.container.removeEventListener(

            "click",

            this.boundHandleClick

        );


        if (this.previousButton) {

            this.previousButton.removeEventListener(

                "click",

                this.boundHandlePrevious

            );

        }


        if (this.nextButton) {

            this.nextButton.removeEventListener(

                "click",

                this.boundHandleNext

            );

        }


        if (this.keyboard) {

            this.container.removeEventListener(

                "keydown",

                this.boundHandleKeyboard

            );

        }


        if (
            this.swipe &&
            this.track
        ) {

            this.track.removeEventListener(

                "touchstart",

                this.boundHandleTouchStart

            );


            this.track.removeEventListener(

                "touchend",

                this.boundHandleTouchEnd

            );

        }


        this.container.removeEventListener(

            "pointerdown",

            this.boundHandlePointerDown

        );


        this.container.removeEventListener(

            "pointerup",

            this.boundHandlePointerUp

        );


        mediaRailEvents.emit(

            MediaRailEventTypes.DESTROYED,

            {

                controller: this

            }

        );


        /*==========================================
            Reset
        ==========================================*/

        this.container = null;

        this.track = null;

        this.viewport = null;

        this.previousButton = null;

        this.nextButton = null;

        this.itemElements = [];

        this.items = [];

        this.currentMovie = null;

        this.currentIndex = 0;

        this.title = "More Movies";

        this.ariaLabel = "More movies";

        this.initialized = false;

    }

}


/*==================================================
Public Export
==================================================*/

export {

    MediaRailController

};


export const mediaRailController =
    new MediaRailController();