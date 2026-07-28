/*

"use strict";


const pluginRegistry = [];


export function registerPlugin(plugin) {

    pluginRegistry.push(plugin);

}


export function getPlugins() {

    return pluginRegistry;

}

*/


"use strict";

const pluginRegistry = [];

/*==============================================
    Register Plugin
==============================================*/

export function registerPlugin(plugin) {

    if (!plugin || !plugin.name) {

        console.error("Invalid plugin.");

        return;

    }

    const exists = pluginRegistry.some(

        item => item.name === plugin.name

    );

    if (exists) {

        return;

    }

    pluginRegistry.push(plugin);

}

/*==============================================
    Get Plugins
==============================================*/

export function getPlugins() {

    return [...pluginRegistry];

}