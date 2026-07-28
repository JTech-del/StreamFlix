"use strict";


const pluginRegistry = [];


export function registerPlugin(plugin) {

    pluginRegistry.push(plugin);

}


export function getPlugins() {

    return pluginRegistry;

}