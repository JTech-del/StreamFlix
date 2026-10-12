"use strict";

/*==================================================
    StreamFlix

    Authentication State

    Responsibility:

    ✓ Hold the current authenticated user
    ✓ Hold the current access token in memory
    ✓ Hold the current session ID
    ✓ Track authentication initialization state
    ✓ Provide a small subscription mechanism

    Security:

    ✗ Never stores refresh tokens
    ✗ Never writes authentication data to localStorage
    ✗ Never writes authentication data to sessionStorage

    The refresh token is managed exclusively by the
    browser through the HttpOnly refresh cookie.
==================================================*/


const authState = {

    /*----------------------------------------------
        Authentication Data
    ----------------------------------------------*/

    accessToken: null,

    sessionId: null,

    user: null,


    /*----------------------------------------------
        Authentication Status

        initialized:
            false = authentication has not yet
                    been restored/checked

            true  = initial authentication check
                    has completed
    ----------------------------------------------*/

    initialized: false,


    /*----------------------------------------------
        Subscribers

        UI/controllers can subscribe to authentication
        changes without coupling themselves to the
        authentication service.
    ----------------------------------------------*/

    listeners: new Set()

};


/*==================================================
    Get State
==================================================*/

export function getAuthState() {

    return {

        accessToken:
            authState.accessToken,

        sessionId:
            authState.sessionId,

        user:
            authState.user,

        initialized:
            authState.initialized

    };

}


/*==================================================
    Set Authentication
==================================================*/

export function setAuthentication({

    accessToken,

    sessionId = null,

    user = null

}) {

    authState.accessToken =
        accessToken;

    authState.sessionId =
        sessionId;

    authState.user =
        user;

    authState.initialized =
        true;

    notifyListeners();

}


/*==================================================
    Update Authentication User
==================================================*/

export function setAuthenticatedUser(
    user
) {

    authState.user =
        user;

    notifyListeners();

}


/*==================================================
    Mark Authentication Initialized
==================================================*/

export function setAuthInitialized() {

    authState.initialized =
        true;

    notifyListeners();

}


/*==================================================
    Clear Authentication
==================================================*/

export function clearAuthentication() {

    authState.accessToken =
        null;

    authState.sessionId =
        null;

    authState.user =
        null;

    authState.initialized =
        true;

    notifyListeners();

}


/*==================================================
    Authentication Check
==================================================*/

export function isAuthenticated() {

    return Boolean(
        authState.accessToken
    );

}


/*==================================================
    Subscribe
==================================================*/

export function subscribeToAuthState(
    listener
) {

    if (
        typeof listener !==
        "function"
    ) {

        throw new TypeError(
            "Authentication state listener must be a function."
        );

    }

    authState.listeners.add(
        listener
    );


    return function unsubscribe() {

        authState.listeners.delete(
            listener
        );

    };

}


/*==================================================
    Notify Subscribers
==================================================*/

function notifyListeners() {

    const state =
        getAuthState();

    authState.listeners.forEach(
        listener => {

            listener(state);

        }
    );

}
