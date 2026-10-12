"use strict";

/*==================================================
    StreamFlix

    Authentication Service

    Responsibility:

    ✓ Coordinate authentication API calls
    ✓ Update the global authentication state
    ✓ Keep the access token in memory only
    ✓ Restore authentication through the refresh cookie
    ✓ Handle login and logout lifecycle

    Security:

    ✗ Never stores refresh tokens
    ✗ Never reads the HttpOnly refresh cookie
    ✗ Never writes authentication data to localStorage
    ✗ Never writes authentication data to sessionStorage

    The browser manages the refresh cookie.
==================================================*/


import {
    register as registerRequest,
    login as loginRequest,
    refresh as refreshRequest,
    logout as logoutRequest,
    verifyEmail as verifyEmailRequest,
    forgotPassword as forgotPasswordRequest,
    resetPassword as resetPasswordRequest
} from "../api/authApi.js";


import {
    getAuthState,
    setAuthentication,
    setAuthInitialized,
    clearAuthentication,
    setAuthenticatedUser,
    isAuthenticated,
    subscribeToAuthState
} from "../state/authState.js";


/*==================================================
    Register
==================================================*/

export async function register(
    email,
    password
) {

    return registerRequest(
        email,
        password
    );

}


/*==================================================
    Login
==================================================*/

export async function login(
    email,
    password
) {

    const response =
        await loginRequest(
            email,
            password
        );


    const data =
        response?.data;


    if (
        !data?.accessToken
    ) {

        throw new Error(
            "Login response did not contain an access token."
        );

    }


    setAuthentication({

        accessToken:
            data.accessToken,

        sessionId:
            data.sessionId || null,

        user:
            data.user || null

    });


    return response;

}


/*==================================================
    Restore Authentication
==================================================

    The refresh token is already held by the browser
    as an HttpOnly cookie.

    The frontend does NOT read or send that token.
==================================================*/

export async function restoreAuthentication() {

    try {

        const response =
            await refreshRequest();


        const data =
            response?.data;


        if (
            !data?.accessToken
        ) {

            throw new Error(
                "Refresh response did not contain an access token."
            );

        }


        setAuthentication({

            accessToken:
                data.accessToken,

            sessionId:
                data.sessionId || null,

            user:
                null

        });


        return response;

    } catch (error) {

        clearAuthentication();

        return null;

    }

}


/*==================================================
    Refresh Access Token
==================================================*/

export async function refreshAccessToken() {

    const response =
        await refreshRequest();


    const data =
        response?.data;


    if (
        !data?.accessToken
    ) {

        throw new Error(
            "Refresh response did not contain an access token."
        );

    }


    const currentState =
        getAuthState();


    setAuthentication({

        accessToken:
            data.accessToken,

        sessionId:
            data.sessionId ||
            currentState.sessionId,

        user:
            currentState.user

    });


    return response;

}


/*==================================================
    Logout
==================================================*/

export async function logout() {

    try {

        return await logoutRequest();

    } finally {

        clearAuthentication();

    }

}


/*==================================================
    Verify Email
==================================================*/

export async function verifyEmail(
    token
) {

    return verifyEmailRequest(
        token
    );

}


/*==================================================
    Forgot Password
==================================================*/

export async function forgotPassword(
    email
) {

    return forgotPasswordRequest(
        email
    );

}


/*==================================================
    Reset Password
==================================================*/

export async function resetPassword(
    token,
    newPassword
) {

    return resetPasswordRequest(
        token,
        newPassword
    );

}


/*==================================================
    Update Authenticated User
==================================================*/

export function updateAuthenticatedUser(
    user
) {

    setAuthenticatedUser(
        user
    );

}


/*==================================================
    Authentication State Access
==================================================*/

export function getAuthenticationState() {

    return getAuthState();

}


export function checkAuthentication() {

    return isAuthenticated();

}


/*==================================================
    Authentication Initialization
==================================================*/

export function markAuthenticationInitialized() {

    setAuthInitialized();

}


/*==================================================
    Authentication Subscription
==================================================*/

export function subscribeToAuthentication(
    listener
) {

    return subscribeToAuthState(
        listener
    );

}
