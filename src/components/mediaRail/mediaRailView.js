"use strict";

/*==================================================
    Media Rail View

==================================================*/

import { mediaRailTemplates } from "./mediaRailTemplates.js";
class MediaRailView {

    constructor() {

        this.container = null;


        this.track = null;

        this.items = [];


        this.markup = "";

        this.activeItem = null;

        this.focusedItem = null;
    }




    /*==============================================
    Initialize
==============================================*/
    init(container) {

            if (!container) {

                return;

            }

            this.container = container;

        }
        /*==============================================
    Render
==============================================*/

    render(items, template = "item") {

            this.beforeRender();

            this.buildMarkup(

                items,

                template

            );

            this.beforeInject();

            this.injectMarkup();

            this.afterInject();



            this.afterRender();

        }
        /*==============================================
    Render Before 
    =============================*/
    beforeRender() {}




    /*==============================================
        Build Markup
    ==============================================*/

    buildMarkup(items, template = "item") {

            const renderer =

                mediaRailTemplates[template];

            if (!renderer) {

                return;

            }

            this.markup = items

                .map((movie, index) =>

                renderer(movie, index)

            )

            .join("");

        }
        /*==============================================
    Inject Markup
==============================================*/

    injectMarkup() {

        if (!this.container) {

            return;

        }

        this.container.innerHTML =

            this.markup;

    }

    /*==============================================
        After Inject
    ==============================================*/
    afterInject() {

        this.bindAccessibility();

    }


    /*==============================================
        Cache Items
    ==============================================*/

    cacheItems() {

            this.items = Array.from(

                this.container.querySelectorAll(

                    ".mediaRail__item"

                )

            );

        }
        /*==============================================
                After Render
            ==============================================*/
    afterRender() {


    }

    /*==============================================
    Refresh
==============================================*/

    refresh(items, renderer) {

        this.render(

            items,

            renderer

        );

    }

    /*==============================================
    Focus (index)
==============================================*/

    focus(index, options = {}) {

        const settings = {

            scroll: true,

            smooth: true,

            center: true,

            animate: true,

            ...options

        };

        this.setFocused(index);

        if (settings.scroll) {

            this.scrollTo(index, settings);

        }

        if (settings.animate) {

            this.animate(index);

        }

    }



    /*==============================================
        Accessibility 
    ==============================================*/
    bindAccessibility() {

        }
        /*==============================================
    Set Focused Item
==============================================*/

    setFocused(index) {

            this.clearFocus();

            const item = this.items[index];

            if (!item) {

                return;

            }

            item.classList.add(

                "is-focused"

            );

            this.focusedItem = item;

        }
        /*==============================================
    Focus Item
==============================================*/

    focusItem(selector) {

        const item = this.container.querySelector(

            selector

        );

        if (!item) {

            return;

        }

        item.focus({

            preventScroll: true

        });

    }

    /*==============================================
        Set Active Item
    ==============================================*/

    setActiveItem(activeSelector) {

        if (!this.container) {

            console.error("MediaRailView has not been initialized.");

            return;

        }

        this.clearActive();

        const item = this.container.querySelector(activeSelector);

        if (!item) {

            return;

        }

        item.classList.add("is-active");

        this.activeItem = item;

    }


    /*==============================================
    Clear Active Item
==============================================*/

    clearActive() {

        if (!this.activeItem) {

            return;

        }

        this.activeItem.classList.remove(

            "is-active"

        );

        this.activeItem = null;

    }

    /*==============================================
    Clear Focus
==============================================*/

    clearFocus() {

            if (!this.focusedItem) {

                return;

            }

            this.focusedItem.classList.remove(

                "is-focused"

            );

            this.focusedItem = null;

        }
        /*==============================================
    Set Active Item
==============================================*/
    setActiveItem(itemSelector, activeSelector) {

            this.clearActive();


            const item = this.container.querySelector(activeSelector);


            if (!item) {

                return;

            }


            item.classList.add("is-active");


            this.activeItem = item;

        }
        /*==============================================
    Scroll to  Item
==============================================*/
    scrollToItem(selector) {

        const item =
            this.container.querySelector(selector);


        if (!item) {

            return;

        }


        item.scrollIntoView({

            behavior: "smooth",

            inline: "center",

            block: "nearest"

        });

    }

    /*==============================================
    visible items
==============================================*/

    isVisible(item) {

        const container =

            this.container.getBoundingClientRect();

        const element =

            item.getBoundingClientRect();

        return (

            element.left >= container.left &&

            element.right <= container.right

        );

    }

    /*==============================================
    Scroll TO Index
==============================================*/

    scrollTo(index, options) {

            const item =

                this.items[index];

            if (!item) {

                return;

            }

            if (this.isVisible(item)) {

                return;

            }

            item.scrollIntoView({

                behavior:

                    options.smooth

                    ?
                    "smooth"

                    : "auto",

                inline:

                    options.center

                    ?
                    "center"

                    : "nearest",

                block: "nearest"

            });

        }
        /*==============================================
    Animate Index
==============================================*/

    animate(index) {

        const item = this.items[index];

        if (!item) {

            return;

        }

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

            { once: true }

        );

    }




}




export const mediaRailView =
    new MediaRailView();