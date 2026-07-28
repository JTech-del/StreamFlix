"use strict";

/*==================================================
    Media Rail Controller

    Responsibility:

    ✓ Generic rail navigation
    ✓ Generic scrolling
    ✓ Generic active state
    ✓ Generic keyboard support
    ✓ Generic swipe support
    ✓ Event orchestration
    ✓ Plugin initialization

==================================================*/

import { mediaRailService } from "./mediaRailService.js";
import { mediaRailView } from "./mediaRailView.js";
import { mediaRailEvents } from "./mediaRailEvents.js";
import { MediaRailEventTypes } from "./mediaRailEventTypes.js";
import { MediaRailDirections } from "./mediaRailDirections.js";

class MediaRailController {

    constructor() {

        this.config = {};

        this.service = mediaRailService;

        this.view = mediaRailView;

        this.events = mediaRailEvents;

    }

    /*==============================================
        Default Configuration
    ==============================================*/

    getDefaultConfig() {

        return {

            container: null,

            items: [],

            renderer: null,

            template: "item",

            loop: false,

            keyboard: false,

            swipe: false,

            autoplay: false,

            visibleItems: 6,

            animationDuration: 300,

            plugins: [],

            hooks: {

                onInit: null,

                onRender: null,

                onNavigate: null,

                onItemChange: null,

                onDestroy: null

            }

        };

    }

    /*==============================================
        Initialize
    ==============================================*/

    init(config = {}) {

        this.config = {

            ...this.getDefaultConfig(),

            ...config

        };

        this.service.configure({

            items: this.config.items,

            loop: this.config.loop

        });

        this.view.init(

            this.config.container

        );

        this.initializePlugins();

        this.runHook(

            "onInit",

            {

                items: this.service.getItems(),

                total: this.service.getTotalItems()

            }

        );

        this.emit(

            MediaRailEventTypes.INITIALIZED,

            {

                controller: this,

                totalItems: this.service.getTotalItems()

            }

        );

        this.navigate(MediaRailDirections.NEXT);

    }

    /*==============================================
        Render
    ==============================================*/

    render() {

            const items =

                this.service.getItems();

            this.view.render(

                items,

                this.config.template

            );

            this.runHook(

                "onRender",

                items

            );

            this.emit(

                MediaRailEventTypes.RENDERED,

                items

            );

        }
        /*==============================================
            Navigate
        ==============================================*/

    navigate(direction) {

            const item =

                this.service.navigate(direction);

            if (!item) {

                return;

            }

            this.view.update(item);

            this.runHook("onNavigate", {
                    direction,
                    item,
                    index:

                        this.service.getCurrentIndex()

                }

            );

            this.emit(

                direction === "next"

                ?
                MediaRailEventTypes.NEXT

                :
                MediaRailEventTypes.PREVIOUS,

                {

                    direction,

                    item,

                    index:

                        this.service.getCurrentIndex()

                }

            );

        }
        /*==============================================
            Next
        ==============================================*

    next() {

        const item =

            this.service.next();

        if (!item) {

            return;

        }

        this.view.update(item);

        this.runHook(

            "onNavigate",

            {

                item,

                index: this.service.getCurrentIndex()

            }

        );

        this.emit(

            MediaRailEventTypes.NEXT,

            {

                item,

                index: this.service.getCurrentIndex()

            }

        );

    }

    /*==============================================
        Previous
    ==============================================*

    previous() {

        const item =

            this.service.previous();

        if (!item) {

            return;

        }

        this.view.update(item);

        this.runHook(

            "onNavigate",

            {

                item,

                index: this.service.getCurrentIndex()

            }

        );

        this.emit(

            MediaRailEventTypes.PREVIOUS,

            {

                item,

                index: this.service.getCurrentIndex()

            }

        );

    }

    /*==============================================
        Focus
    ==============================================*/

    focus(index) {

        this.view.focus(index);

        this.emit(

            MediaRailEventTypes.ITEM_FOCUSED,

            {

                index,

                item: this.service.getMovieByIndex(index)

            }

        );

    }

    /*==============================================
        Activate
    ==============================================*/

    activate(index) {

        this.service.setCurrentIndex(index);

        this.view.setActive(index);

        const item = this.service.getCurrentMovie();

        this.runHook("onItemChange", { item, index });

        this.emit(MediaRailEventTypes.ITEM_ACTIVATED, { item, index });

    }

    /*==============================================
        Emit Event
    ==============================================*/

    emit(type, payload = null) {

        this.events.emit(

            type,

            payload

        );

    }

    /*==============================================
    Subscribe
==============================================*/

    subscribe(type, handler) {

            this.events.on(

                type,

                handler

            );

            controller.subscribe(

                MediaRailEventTypes.ITEM_ACTIVATED,

                payload => {

                    analytics.track(

                        payload.item

                    );

                }

            );

            controller.subscribe(

                MediaRailEventTypes.ITEM_CHANGED,

                payload => {

                    notifications.show(

                        payload.item.title

                    );

                }

            );

        }
        /*==============================================
    Unsubscribe
==============================================*/

    unsubscribe(type, handler) {

        this.events.off(

            type,

            handler

        );

    }


    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.emit(

            MediaRailEventTypes.DESTROYED

        );

        this.runHook(

            "onDestroy"

        );

    }

}

export const mediaRailController =
    new MediaRailController();