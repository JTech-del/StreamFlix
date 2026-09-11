"use strict";

/*==================================================
    Media Rail Service

    Responsibility:

    ✓ Item State
    ✓ Navigation
    ✓ Current Index
    ✓ Looping

    Does NOT handle:

    ✗ DOM
    ✗ Events
    ✗ UI
    ✗ Playback
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

        this.items =

            Array.isArray(items)

        ?
        items

            : [];


        this.currentIndex = 0;

        this.loop = Boolean(loop);

    }


    /*==============================================
        Get Items
    ==============================================*/

    getItems() {

        return this.items;

    }


    /*==============================================
        Get Total Items
    ==============================================*/

    getTotalItems() {

        return this.items.length;

    }


    /*==============================================
        Get Current Index
    ==============================================*/

    getCurrentIndex() {

        return this.currentIndex;

    }


    /*==============================================
        Get Current Item
    ==============================================*/

    getCurrentItem() {

        if (!this.items.length) {

            return null;

        }


        return (

            this.items[this.currentIndex]

            ||
            null

        );

    }


    /*==============================================
        Set Current Index
    ==============================================*/

    setCurrentIndex(index) {

        if (!Number.isInteger(index)) {

            return;

        }


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
        Next
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
        Previous
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
        Go To
    ==============================================*/

    goTo(index) {

        if (!Number.isInteger(index)) {

            return null;

        }


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
        First
    ==============================================*/

    first() {

        if (!this.items.length) {

            return null;

        }


        this.currentIndex = 0;


        return this.getCurrentItem();

    }


    /*==============================================
        Last
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


/*==================================================
    Public Exports
==================================================*/

export {

    MediaRailService

};


export const mediaRailService =

    new MediaRailService();