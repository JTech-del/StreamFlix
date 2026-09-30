"use strict";

import "dotenv/config";

const REQUIRED_SECRET_MIN_LENGTH = 32;

function requireSecret(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is required`);
    }

    if (value.length < REQUIRED_SECRET_MIN_LENGTH) {
        throw new Error(
            `${name} must be at least ${REQUIRED_SECRET_MIN_LENGTH} characters long`
        );
    }

    return value;
}

function requireNonEmpty(name, value) {
    if (!value || typeof value !== "string" || value.trim() === "") {
        throw new Error(`${name} is required`);
    }

    return value.trim();
}

function parseBoolean(value, defaultValue = false) {
    if (value === undefined) {
        return defaultValue;
    }

    return value.toLowerCase() === "true";
}

const config = {
    port: Number(process.env.PORT) || 5000,

    database: {
        mongoUri: requireNonEmpty(
            "MONGODB_URI",
            process.env.MONGODB_URI
        )
    },

jwt: {
    accessSecret: requireSecret("JWT_ACCESS_SECRET"),
    refreshSecret: requireSecret("JWT_REFRESH_SECRET"),

    accessExpiresIn:
        process.env.JWT_ACCESS_EXPIRES_IN || "15m",

    refreshExpiresIn:
        process.env.JWT_REFRESH_EXPIRES_IN || "7d",

    algorithm: "HS256",
    issuer: "streamflix-api",
    audience: "streamflix-client"
},

session: {
    maxLifetime:
        process.env.SESSION_MAX_LIFETIME || "30d"
},

    http: {
        corsOrigin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",

        jsonLimit:
            process.env.JSON_BODY_LIMIT ||
            "1mb",

        trustProxy:
            parseBoolean(
                process.env.TRUST_PROXY,
                false
            )
    },

    email: {
        resendApiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM
    },

    tmdb: {
        apiKey: process.env.TMDB_API_KEY
    }
};

export default config;