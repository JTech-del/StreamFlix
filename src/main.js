"use strict";


//==============================================
// Application
//==============================================

import App from "./app.js";


//==============================================
// Plugin System
//==============================================

import PluginManager from "./core/mediaRail/pluginManager.js";

import SubtitlePlugin from "./core/pluginCore/subtitlePlugin/subtitlePlugin.js";



//==============================================
// Register Plugins
//==============================================

PluginManager.install(
    SubtitlePlugin
);



//==============================================
// Start Application
//==============================================

App.init();



//==============================================
// Initialize Plugins
//==============================================

PluginManager.initialize(App);
//==============================================
// Temporary Backend API Test
//==============================================
/*
import "./api/testMovieApi.js";
*/