"use strict";

import "dotenv/config";

const config = {
    port: Number(process.env.PORT) || 5000,

    database: {
        mongoUri: process.env.MONGODB_URI
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
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
