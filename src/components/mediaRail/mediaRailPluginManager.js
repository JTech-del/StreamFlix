"use strict";

/*==================================================
    Media Rail Plugin Manager

    Responsibility

    ✓ Plugin Lifecycle
==================================================*/

class MediaRailPluginManager {

    constructor() {

        this.plugins = [];

    }

    /*==============================================
    Install Plugin
==============================================*/

    install(plugin, controller) {

            if (!plugin) {

                return;

            }

            plugin.install(controller);

            plugin.enable();

            this.plugins.push(plugin);

        }
        /*==============================================
            Install Plugins
        ==============================================*/

    installAll(

        plugins,

        controller

    ) {

        plugins.forEach(plugin => {

            this.install(

                plugin,

                controller

            );

        });

    }
    disable(pluginClass) {

        const plugin =

            this.find(pluginClass);

        if (!plugin) {

            return;

        }

        plugin.disable();

    }

    find(pluginClass) {

        return this.plugins.find(plugin => {

            return plugin instanceof pluginClass;

        });

    }

    destroy() {

        this.plugins.forEach(plugin => {

            plugin.destroy();

        });

        this.plugins = [];

    }

}

export const mediaRailPluginManager =
    new MediaRailPluginManager();