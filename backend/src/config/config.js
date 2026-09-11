/*==================================================
    StreamFlix

    Application Configuration

    Responsibility

    ✓ Centralize environment configuration
    ✓ Expose database configuration
    ✓ Keep secrets outside source code
==================================================*/
import "dotenv/config";

const config = {
    port: Number(process.env.PORT) || 5000,

    database: {
        mongoUri: process.env.MONGODB_URI
    },

    tmdb: {
        apiKey: process.env.TMDB_API_KEY
    }
};

export default config;