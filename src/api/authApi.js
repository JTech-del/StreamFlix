"use strict";

/*==================================================
    StreamFlix

    Authentication API

    Responsibility:

    ✓ Communicate with backend authentication routes
    ✓ Send credentials when required
    ✓ Receive authentication responses
    ✓ Keep HTTP concerns separate from auth state

    Security:

    ✓ Refresh token is handled by the browser cookie
    ✓ credentials: "include" is required for cookie transport
    ✗ Never reads the refresh token
    ✗ Never stores the refresh token
    ✗ Never writes authentication data to storage
    ✗ Never manages authentication state
==================================================*/


const BACKEND_BASE_URL =
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5000";


const API_BASE_URL =
    `${BACKEND_BASE_URL}/api`;


/*==================================================
    Generic Authentication Request
==================================================*/

async function request(
    endpoint,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,

                credentials: "include",

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        const error =
            new Error(
                data?.message ||
                "Authentication request failed."
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;

    }


    return data;

}


/*==================================================
    Register
==================================================*/

export function register(
    email,
    password
) {

    return request(
        "/auth/register",
        {
            method: "POST",

            body: JSON.stringify({
                email,
                password
            })
        }
    );

}


/*==================================================
    Login
==================================================*/

export function login(
    email,
    password
) {

    return request(
        "/auth/login",
        {
            method: "POST",

            body: JSON.stringify({
                email,
                password
            })
        }
    );

}


/*==================================================
    Refresh Access Token
==================================================*/

export function refresh() {

    return request(
        "/auth/refresh",
        {
            method: "POST"
        }
    );

}


/*==================================================
    Logout
==================================================*/

export function logout() {

    return request(
        "/auth/logout",
        {
            method: "POST"
        }
    );

}


/*==================================================
    Verify Email
==================================================*/

export function verifyEmail(
    token
) {

    const params =
        new URLSearchParams({
            token
        });


    return request(
        `/auth/verify-email?${params.toString()}`,
        {
            method: "GET"
        }
    );

}


/*==================================================
    Forgot Password
==================================================*/

export function forgotPassword(
    email
) {

    return request(
        "/auth/forgot-password",
        {
            method: "POST",

            body: JSON.stringify({
                email
            })
        }
    );

}


/*==================================================
    Reset Password
==================================================*/

export function resetPassword(
    token,
    newPassword
) {

    return request(
        "/auth/reset-password",
        {
            method: "POST",

            body: JSON.stringify({
                token,
                newPassword
            })
        }
    );

}
