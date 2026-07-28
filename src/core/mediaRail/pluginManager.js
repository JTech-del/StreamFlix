"use strict";


import { registerPlugin, getPlugins } from "./pluginRegistry.js";



class PluginManager {


    constructor() {

        this.plugins = [];

    }


    install(plugin) {

        if (!plugin || !plugin.name) {

            console.error("Invalid plugin.");

            return;

        }

        const exists = this.plugins.some(

            registered => registered.name === plugin.name

        );

        if (exists) {

            console.warn(

                `${plugin.name} is already installed.`

            );

            return;

        }

        registerPlugin(plugin);

        this.plugins.push(plugin);

        console.log(

            `${plugin.name} installed.`

        );

    }


    initialize(app) {


        this.plugins.forEach(plugin => {


            if (plugin.init) {

                plugin.init(app);

            }


        });


    }

    getInstalledPlugins() {

        return [...this.plugins];

    }
    remove(pluginName) {

        const plugin = this.plugins.find(

            item => item.name === pluginName

        );

        if (plugin && typeof plugin.destroy === "function") {

            plugin.destroy();

        }

        this.plugins = this.plugins.filter(

            item => item.name !== pluginName

        );

    }

}





export default new PluginManager();