"use strict";

/*==================================================
    StreamFlix

    Authenticated API Service

    Responsibility:

    ✓ Send authenticated API requests
    ✓ Read the access token from in-memory auth state
    ✓ Attach Authorization: Bearer <accessToken>
    ✓ Include browser credentials for cookie transport
    ✓ Return parsed API responses
    ✓ Expose HTTP errors to the calling service

    Security:

    ✓ Access token exists only in memory
    ✓ Refresh token remains browser-managed
    ✓ HttpOnly refresh cookie is never read by JavaScript

    This service does NOT:

    ✗ Perform login
    ✗ Perform logout
    ✗ Store tokens
    ✗ Read the refresh cookie
    ✗ Automatically refresh tokens yet
==================================================*/


import {
    getAuthState
} from "../state/authState.js";
import { refreshAccessToken } from "./authService.js";


const BACKEND_BASE_URL =
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5000";


const API_BASE_URL =
    `${BACKEND_BASE_URL}/api`;

let accessTokenRefreshPromise = null;


/*==================================================
    Authenticated Request
==================================================*/

export async function apiRequest(
    endpoint,
    options = {}
) {
    async function send(accessToken) {
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: "include",
            headers
        });
        let data = null;
        try { data = await response.json(); } catch { data = null; }
        return { response, data };
    }

    const originalAccessToken = getAuthState().accessToken;
    let result = await send(originalAccessToken);

    // Refresh exactly once through the established rotating refresh-cookie flow.
    // Never refresh a request that had no authenticated access token.
    if (
        result.response.status === 401 &&
        originalAccessToken &&
        endpoint !== "/auth/refresh"
    ) {
        try {
            const latestAccessToken = getAuthState().accessToken;
            if (latestAccessToken && latestAccessToken !== originalAccessToken) {
                result = await send(latestAccessToken);
            } else {
                accessTokenRefreshPromise ||= refreshAccessToken().finally(() => {
                    accessTokenRefreshPromise = null;
                });
                await accessTokenRefreshPromise;
                result = await send(getAuthState().accessToken);
            }
        } catch {
            // Preserve the original API error below; no credential data is logged.
        }
    }

    if (!result.response.ok) {
        const error = new Error(result.data?.message || "API request failed.");
        error.status = result.response.status;
        error.data = result.data;
        throw error;
    }
    return result.data;

}
