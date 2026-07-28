"use strict";


import {
    registerPlugin,
    getPlugins

} from "./pluginRegistry.js";



class PluginManager {


    constructor() {

        this.plugins = [];

    }



    install(plugin) {

        registerPlugin(plugin);

        this.plugins.push(plugin);


        console.log(
            `${plugin.name} installed`
        );

    }



    initialize(app) {


        this.plugins.forEach(plugin => {


            if (plugin.init) {

                plugin.init(app);

            }


        });


    }



    remove(pluginName) {


        this.plugins =
            this.plugins.filter(
                plugin =>
                plugin.name !== pluginName
            );







    }




}



export default new PluginManager();