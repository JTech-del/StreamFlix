/*==================================================
    StreamFlix

    MongoDB Database Connection

    Responsibility

    ✓ Establish MongoDB connection
    ✓ Validate MongoDB configuration
    ✓ Expose connection lifecycle
    ✓ Log connection states
    ✓ Gracefully handle connection errors
    ✓ Prevent duplicate connections
    ✓ Handle MongoDB connection events
    ✓ No Express logic
    ✓ No model logic
==================================================*/

import mongoose from "mongoose";

import config from "./config.js";


/*==================================================
    MongoDB Connection Options
==================================================*/

const connectionOptions = {

    serverSelectionTimeoutMS: 5000,

    socketTimeoutMS: 45000

};


/*==================================================
    Connect To MongoDB
==================================================*/

export async function connectDatabase() {

    const mongoUri = config.database.mongoUri;


    /*----------------------------------------------
        Validate MongoDB Configuration
    ----------------------------------------------*/

    if (!mongoUri) {

        throw new Error(
            "MONGODB_URI is not configured."
        );

    }


    /*----------------------------------------------
        Prevent Duplicate Connections
    ----------------------------------------------*/

    if (
        mongoose.connection.readyState === 1
    ) {

        console.log(
            "StreamFlix MongoDB is already connected."
        );

        return mongoose.connection;

    }


    if (
        mongoose.connection.readyState === 2
    ) {

        console.log(
            "StreamFlix MongoDB connection is already in progress."
        );

        return mongoose.connection;

    }


    /*----------------------------------------------
        Connect
    ----------------------------------------------*/

    try {

        await mongoose.connect(
            mongoUri,
            connectionOptions
        );


        console.log(
            "StreamFlix MongoDB connected."
        );

        console.log(
            `MongoDB database: ${mongoose.connection.name}`
        );

        console.log(
            `MongoDB host: ${mongoose.connection.host}`
        );


        return mongoose.connection;

    } catch (error) {

        console.error(
            "StreamFlix MongoDB connection failed:",
            error.message
        );

        throw error;

    }

}


/*==================================================
    Disconnect From MongoDB
==================================================*/

export async function disconnectDatabase() {

    if (
        mongoose.connection.readyState === 0
    ) {

        console.log(
            "StreamFlix MongoDB is already disconnected."
        );

        return;

    }


    try {

        await mongoose.disconnect();

        console.log(
            "StreamFlix MongoDB disconnected."
        );

    } catch (error) {

        console.error(
            "StreamFlix MongoDB disconnection failed:",
            error.message
        );

        throw error;

    }

}


/*==================================================
    Database State
==================================================*/

export function getDatabaseState() {

    return mongoose.connection.readyState;

}


/*==================================================
    MongoDB Connection Events
==================================================*/

mongoose.connection.on(
    "connected",
    () => {

        console.log(
            "StreamFlix MongoDB connection established."
        );

    }
);


mongoose.connection.on(
    "error",
    (error) => {

        console.error(
            "StreamFlix MongoDB connection error:",
            error.message
        );

    }
);


mongoose.connection.on(
    "disconnected",
    () => {

        console.warn(
            "StreamFlix MongoDB connection lost."
        );

    }
);