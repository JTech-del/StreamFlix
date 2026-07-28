"use strict";

/*==================================================
    Media Rail Service

    Responsibility

    ✓ Item State
    ✓ Navigation
    ✓ Current Index
    ✓ Looping
==================================================*/

class MediaRailService {

    constructor() {

        this.items = [];

        this.currentIndex = 0;

        this.loop = false;

    }

    /*==============================================
    Configure
==============================================*/

    configure({

        items = [],

        loop = false

    } = {}) {

        this.items = items;

        this.currentIndex = 0;

        this.loop = loop;

    }

    getItems() {

        return this.items;

    }
    getTotalItems() {

        return this.items.length;

    }
    getCurrentIndex() {

        return this.currentIndex;

    }
    getCurrentItem() {

        return this.items[

            this.currentIndex

        ];

    }

    setCurrentIndex(index) {

        if (

            index < 0 ||

            index >= this.items.length

        ) {

            return;

        }

        this.currentIndex = index;

    }


    /*==============================================
    Navigate
==============================================*/

    navigate(direction) {

            switch (direction) {

                case "next":

                    return this.next();

                case "previous":

                    return this.previous();

                default:

                    return null;

            }

        }
        /*==============================================
            Next Item
        ==============================================*/

    next() {

        if (!this.items.length) {

            return null;

        }

        if (

            this.currentIndex >=

            this.items.length - 1

        ) {

            if (!this.loop) {

                return this.getCurrentItem();

            }

            this.currentIndex = 0;

            return this.getCurrentItem();

        }

        this.currentIndex++;

        return this.getCurrentItem();

    }

    /*==============================================
        Previous Item
    ==============================================*/

    previous() {

            if (!this.items.length) {

                return null;

            }

            if (this.currentIndex <= 0) {

                if (!this.loop) {

                    return this.getCurrentItem();

                }

                this.currentIndex =

                    this.items.length - 1;

                return this.getCurrentItem();

            }

            this.currentIndex--;

            return this.getCurrentItem();

        }
        /*==============================================
            Go To Item
        ==============================================*/

    goTo(index) {

            if (

                index < 0 ||

                index >= this.items.length

            ) {

                return null;

            }

            this.currentIndex = index;

            return this.getCurrentItem();

        }
        /*==============================================
            First Item
        ==============================================*/

    first() {

            if (!this.items.length) {

                return null;

            }

            this.currentIndex = 0;

            return this.getCurrentItem();

        }
        /*==============================================
    Last Item
==============================================*/

    last() {

        if (!this.items.length) {

            return null;

        }

        this.currentIndex =

            this.items.length - 1;

        return this.getCurrentItem();

    }

    /*==============================================
    Has Next
==============================================*/

    hasNext() {

            return (

                this.loop ||

                this.currentIndex <

                this.items.length - 1

            );

        }
        /*==============================================
            Has Previous
        ==============================================*/

    hasPrevious() {

        return (

            this.loop ||

            this.currentIndex > 0

        );

    }

}

export const mediaRailService =
    new MediaRailService();