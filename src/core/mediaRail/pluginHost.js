"use strict";

/*==================================================
    StreamFlix

    Plugin Host

    Responsibility:

    ✓ Mount plugin host
    ✓ Store host container
    ✓ Expose host element
    ✓ Clear mounted plugins

==================================================*/

class PluginHost {

    constructor() {

        this.container = null;

    }

    /*==============================================
        Mount
    ==============================================*/

    mount(container) {

        if (!container) {

            console.error(

                "Plugin host container not found."

            );

            return;

        }

        this.container = container;

    }

    /*==============================================
        Get Container
    ==============================================*/

    getContainer() {

        return this.container;

    }

    /*==============================================
        Is Mounted
    ==============================================*/

    isMounted() {

        return this.container !== null;

    }

    /*==============================================
        Clear
    ==============================================*/

    clear() {

        if (!this.container) {

            return;

        }

        this.container.innerHTML = "";

    }

    /*==============================================
        Destroy
    ==============================================*/

    destroy() {

        this.clear();

        this.container = null;

    }

}

export const pluginHost = new PluginHost();