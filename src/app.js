"use strict";

/*==================================================
    StreamFlix

    File:
    src/app.js

    Responsibility:
    Application bootstrap layer.

    Starts core application systems.

==================================================*/


import { appController } from "./controllers/appController.js";



const App = {


    init() {

        console.log("✅ StreamFlix App Initialized");


        appController.init();

    }


};



export default App;