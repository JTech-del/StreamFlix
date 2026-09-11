"use strict";

/*==================================================
Media Rail View

```
Responsibility:

✓ Render rail markup
✓ Cache rail items
✓ Cache action buttons
✓ Manage active/focused state
✓ Handle scrolling
✓ Handle animation
✓ Accessibility hooks
✓ Mobile horizontal scrolling

Does NOT handle:

✗ Theatre playback
✗ Download logic
✗ My List state
✗ Business logic
```

==================================================*/

import {
    mediaRailTemplates
} from "./mediaRailTemplates.js";

import {
    mediaRailLayout
} from "./mediaRailLayout.js";

class MediaRailView {


    constructor() {

        /*==========================================
            DOM References
        ==========================================*/

        this.container = null;

        this.slider = null;

        this.viewport = null;

        this.track = null;

        this.previousButton = null;

        this.nextButton = null;


        /*==========================================
            Cached Items
        ==========================================*/

        this.items = [];

        this.theatreButtons = [];

        this.downloadButtons = [];

        this.myListButtons = [];


        /*==========================================
            Render State
        ==========================================*/

        this.markup = "";

        this.activeItem = null;

        this.focusedItem = null;

    }


    /*==================================================
        Initialize
    ==================================================*/

    init(container) {

        if (!container) {

            console.error(
                "MediaRailView container not found."
            );

            return;

        }


        this.container =
            container;


        /*
            Create the shared rail structure.

            Every StreamFlix rail uses
            the exact same layout.
        */

        this.container.innerHTML =
            mediaRailLayout();


        this.cacheElements();

        this.refreshIcons();

    }


    /*==================================================
        Cache Elements
    ==================================================*/

    cacheElements() {

        if (!this.container) {

            return;

        }


        this.slider =
            this.container.querySelector(
                ".mediaRail__slider"
            );


        this.viewport =
            this.container.querySelector(
                ".mediaRail__viewport"
            );


        this.track =
            this.container.querySelector(
                ".mediaRail__track"
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
        Cache Track
    ==================================================*/

    cacheTrack() {

        if (!this.container) {

            return;

        }


        this.track =
            this.container.querySelector(
                ".mediaRail__track"
            );

    }


    /*==================================================
        Render
    ==================================================*/

    render(

        items = [],

        template = "item"

    ) {

        this.beforeRender();


        this.buildMarkup(
            items,
            template
        );


        this.beforeInject();


        this.injectMarkup();


        this.afterInject();


        this.cacheItems();

        this.cacheActions();


        this.afterRender();

    }


    /*==================================================
        Before Render
    ==================================================*/

    beforeRender() {}


    /*==================================================
        Before Inject
    ==================================================*/

    beforeInject() {}


    /*==================================================
        After Inject
    ==================================================*/

    afterInject() {

        this.cacheElements();

        this.cacheItems();

        this.bindAccessibility();

        this.refreshIcons();

    }


    /*==================================================
        After Render
    ==================================================*/

    afterRender() {}


    /*==================================================
        Build Markup
    ==================================================*/

    buildMarkup(

        items = [],

        template = "item"

    ) {

        const renderer =
            mediaRailTemplates[
                template
            ];


        if (
            typeof renderer !==
            "function"
        ) {

            console.error(

                `Media Rail template "${template}" was not found.`

            );


            this.markup = "";

            return;

        }


        this.markup =
            items

            .map(

            (item, index) =>

            renderer(
                item,
                index
            )

        )

        .join("");

    }


    /*==================================================
        Inject Markup
    ==================================================*/

    injectMarkup() {

        if (!this.container) {

            return;

        }


        /*
            If this View is mounted directly
            on the track, inject there.
        */

        if (

            this.container.classList.contains(
                "mediaRail__track"
            )

        ) {

            this.container.innerHTML =
                this.markup;


            this.track =
                this.container;


            return;

        }


        /*
            Normal rail container.
        */

        this.track =
            this.container.querySelector(
                ".mediaRail__track"
            );


        if (this.track) {

            this.track.innerHTML =
                this.markup;


            return;

        }


        /*
            Fallback.

            This allows the View to remain
            resilient if supplied a simple
            mounting element.
        */

        this.container.innerHTML =
            this.markup;

    }


    /*==================================================
        Cache Items
    ==================================================*/

    cacheItems() {

        if (!this.container) {

            return;

        }


        this.items =
            Array.from(

                this.container.querySelectorAll(
                    ".mediaRail__item"
                )

            );

    }


    /*==================================================
        Cache Actions
    ==================================================*/

    cacheActions() {

        if (!this.container) {

            return;

        }


        this.theatreButtons =
            Array.from(

                this.container.querySelectorAll(
                    '[data-action="theatre"]'
                )

            );


        this.downloadButtons =
            Array.from(

                this.container.querySelectorAll(
                    '[data-action="download"]'
                )

            );


        this.myListButtons =
            Array.from(

                this.container.querySelectorAll(
                    '[data-action="my-list"]'
                )

            );

    }


    /*==================================================
        Get Items
    ==================================================*/

    getItems() {

        return this.items;

    }


    /*==================================================
        Get Theatre Buttons
    ==================================================*/

    getTheatreButtons() {

        return this.theatreButtons;

    }


    /*==================================================
        Get Download Buttons
    ==================================================*/

    getDownloadButtons() {

        return this.downloadButtons;

    }


    /*==================================================
        Get My List Buttons
    ==================================================*/

    getMyListButtons() {

        return this.myListButtons;

    }


    /*==================================================
        Get Navigation Buttons
    ==================================================*/

    getPreviousButton() {

        return this.previousButton;

    }


    getNextButton() {

        return this.nextButton;

    }


    /*==================================================
        Refresh Icons
    ==================================================*/
    refreshIcons() {

        if (
            typeof window === "undefined" ||
            !window.lucide ||
            typeof window.lucide.createIcons !== "function"
        ) {
            return;
        }

        window.lucide.createIcons();

        if (!this.container) {
            return;
        }

        this.container
            .querySelectorAll("svg")
            .forEach(svg => {

                svg.setAttribute(
                    "aria-hidden",
                    "true"
                );

                svg.removeAttribute("width");
                svg.removeAttribute("height");

                svg.style.display = "block";
                svg.style.visibility = "visible";
                svg.style.opacity = "1";

            });

    }


    /*==================================================
        Refresh
    ==================================================*/

    refresh(

        items = [],

        renderer = "item"

    ) {

        this.render(
            items,
            renderer
        );

    }


    /*==================================================
        Focus
    ==================================================*/

    focus(

        index,

        options = {}

    ) {

        const settings = {

            scroll: true,

            smooth: true,

            center: true,

            animate: true,

            ...options

        };


        this.setFocused(
            index
        );


        if (settings.scroll) {

            this.scrollTo(
                index,
                settings
            );

        }


        if (settings.animate) {

            this.animate(
                index
            );

        }

    }


    /*==================================================
        Accessibility
    ==================================================*/

    bindAccessibility() {

        if (!this.container) {

            return;

        }


        this.items.forEach(

            (item, index) => {

                item.setAttribute(
                    "role",
                    "article"
                );


                item.setAttribute(
                    "aria-setsize",
                    this.items.length
                );


                item.setAttribute(
                    "aria-posinset",
                    index + 1
                );


                item.setAttribute(
                    "tabindex",
                    "0"
                );

            }

        );

    }


    /*==================================================
        Set Focused Item
    ==================================================*/

    setFocused(index) {

        this.clearFocus();


        const item =
            this.items[index];


        if (!item) {

            return;

        }


        item.classList.add(
            "is-focused"
        );


        this.focusedItem =
            item;

    }


    /*==================================================
        Focus Item
    ==================================================*/

    focusItem(selector) {

        if (!this.container) {

            return;

        }


        const item =
            this.container.querySelector(
                selector
            );


        if (!item) {

            return;

        }


        item.focus({

            preventScroll: true

        });


        this.setFocused(
            this.items.indexOf(item)
        );

    }


    /*==================================================
        Set Active Item
    ==================================================*/

    setActiveItem(activeSelector) {

        if (!this.container) {

            console.error(
                "MediaRailView has not been initialized."
            );

            return;

        }


        this.clearActive();


        const item =
            this.container.querySelector(
                activeSelector
            );


        if (!item) {

            return;

        }


        item.classList.add(
            "is-active"
        );


        item.setAttribute(
            "aria-current",
            "true"
        );


        this.activeItem =
            item;

    }


    /*==================================================
        Set Active By Index
    ==================================================*/

    setActiveIndex(index) {

        const item =
            this.items[index];


        if (!item) {

            return;

        }


        this.clearActive();


        item.classList.add(
            "is-active"
        );


        item.setAttribute(
            "aria-current",
            "true"
        );


        this.activeItem =
            item;

    }


    /*==================================================
        Clear Active
    ==================================================*/

    clearActive() {

        if (!this.activeItem) {

            return;

        }


        this.activeItem.classList.remove(
            "is-active"
        );


        this.activeItem.removeAttribute(
            "aria-current"
        );


        this.activeItem = null;

    }


    /*==================================================
        Clear Focus
    ==================================================*/

    clearFocus() {

        if (!this.focusedItem) {

            return;

        }


        this.focusedItem.classList.remove(
            "is-focused"
        );


        this.focusedItem = null;

    }


    /*==================================================
        Scroll To Item
    ==================================================*/

    scrollToItem(selector) {

        if (!this.container) {

            return;

        }


        const item =
            this.container.querySelector(
                selector
            );


        if (!item) {

            return;

        }


        item.scrollIntoView({

            behavior: "smooth",

            inline: "center",

            block: "nearest"

        });

    }


    /*==================================================
        Visibility
    ==================================================*/

    isVisible(item) {

        if (!this.viewport ||
            !item
        ) {

            return false;

        }


        const container =
            this.viewport.getBoundingClientRect();


        const element =
            item.getBoundingClientRect();


        return (

            element.left >=
            container.left &&

            element.right <=
            container.right

        );

    }


    /*==================================================
        Scroll To Index
    ==================================================*/

    scrollTo(

        index,

        options = {}

    ) {

        const item =
            this.items[index];


        if (!item) {

            return;

        }


        /*
            Avoid unnecessary scrolling when
            the card is already visible.
        */

        if (

            options.scroll !== false &&

            this.isVisible(item)

        ) {

            return;

        }


        item.scrollIntoView({

            behavior: options.smooth ?
                "smooth" : "auto",

            inline: options.center ?
                "center" : "nearest",

            block: "nearest"

        });

    }


    /*==================================================
        Scroll One Card
    ==================================================*/

    scrollByItem(

        direction = "next"

    ) {

        if (!this.viewport) {

            return;

        }


        const firstItem =
            this.items[0];


        if (!firstItem) {

            return;

        }


        const itemWidth =
            firstItem.getBoundingClientRect().width;


        const styles =
            window.getComputedStyle(
                this.track
            );


        const gap =
            parseFloat(

                styles.columnGap ||
                styles.gap ||
                0

            );


        const distance =
            itemWidth + gap;


        this.viewport.scrollBy({

            left: direction === "next" ?
                distance :
                -distance,

            behavior: "smooth"

        });

    }


    /*==================================================
        Mobile Scroll
    ==================================================*/

    enableMobileScroll() {

        if (!this.viewport) {

            return;

        }


        this.viewport.style.touchAction =
            "pan-x";

    }


    /*==================================================
        Animate Index
    ==================================================*/

    animate(index) {

        const item =
            this.items[index];


        if (!item) {

            return;

        }


        item.classList.remove(
            "is-animating"
        );


        /*
            Force reflow so repeated navigation
            can restart the animation.
        */

        void item.offsetWidth;


        item.classList.add(
            "is-animating"
        );


        item.addEventListener(

            "animationend",

            () => {

                item.classList.remove(
                    "is-animating"
                );

            },

            {
                once: true
            }

        );

    }


    /*==================================================
        Update Navigation State
    ==================================================*/

    updateNavigationState({

        hasPrevious = true,

        hasNext = true

    } = {}) {

        if (this.previousButton) {

            this.previousButton.disabled = !hasPrevious;

        }


        if (this.nextButton) {

            this.nextButton.disabled = !hasNext;

        }

    }


    /*==================================================
        Get Active Item
    ==================================================*/

    getActiveItem() {

        return this.activeItem;

    }


    /*==================================================
        Get Focused Item
    ==================================================*/

    getFocusedItem() {

        return this.focusedItem;

    }


    /*==================================================
        Destroy
    ==================================================*/

    destroy() {

        this.container = null;

        this.slider = null;

        this.viewport = null;

        this.track = null;

        this.previousButton = null;

        this.nextButton = null;


        this.items = [];

        this.theatreButtons = [];

        this.downloadButtons = [];

        this.myListButtons = [];


        this.markup = "";

        this.activeItem = null;

        this.focusedItem = null;

    }


}

/*==================================================
Public Exports
==================================================*/

export {


    MediaRailView


};

export const mediaRailView =
    new MediaRailView();