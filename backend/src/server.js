import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "./config/config.js";
import { connectDatabase } from "./config/database.js";

import adminMovieRoutes from "./routes/adminMovieRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import trailerRoutes from "./routes/trailerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

/*==================================================
    StreamFlix Backend Server
==================================================*/

const app = express();

const PORT = config.port;


/*==================================================
    Resolve Project Paths
==================================================*/

const __filename = fileURLToPath(
    import.meta.url
);

const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(
    __dirname,
    "../../"
);

const publicAssetsPath = path.join(
    projectRoot,
    "public",
    "assets"
);


/*==================================================
    Application Trust Configuration
==================================================*/

app.set(
    "trust proxy",
    config.http.trustProxy
);


/*==================================================
    Security Middleware
==================================================*/

app.use(
    helmet()
);


/*==================================================
    CORS
==================================================*/

app.use(
    cors({
        origin: config.http.corsOrigin,
        methods: [
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],
        optionsSuccessStatus: 204
    })
);


/*==================================================
    Request Body Parsing
==================================================*/

app.use(
    express.json({
        limit: config.http.jsonLimit
    })
);


/*==================================================
    Static Media
==================================================*/

app.use(
    "/assets",
    express.static(publicAssetsPath, {
        dotfiles: "deny",
        index: false
    })
);


/*==================================================
    Health Check
==================================================*/

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            message: "StreamFlix API is running"
        });

    }
);


/*==================================================
    Authentication Routes
==================================================*/

app.use(
    "/api/auth",
    authRoutes
);


/*==================================================
    Session Routes
==================================================*/

app.use(
    "/api/sessions",
    sessionRoutes
);


/*==================================================
    Movie Routes
==================================================*/

app.use(
    "/api",
    movieRoutes
);


/*==================================================
    Admin Movie Routes
==================================================*/

app.use(
    "/api/admin",
    adminMovieRoutes
);


/*==================================================
    Video Routes
==================================================*/

app.use(
    "/api/videos",
    videoRoutes
);


/*==================================================
    Trailer Routes
==================================================*/

app.use(
    "/api/trailers",
    trailerRoutes
);


/*==================================================
    Image Routes
==================================================*/

app.use(
    "/api/images",
    imageRoutes
);


/*==================================================
    Profile Routes
==================================================*/

app.use(
    "/api/profile",
    profileRoutes
);


/*==================================================
    404 Handler
==================================================*/

app.use(
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "Route not found"
        });

    }
);


/*==================================================
    Central Error Handler
==================================================*/

app.use(
    (error, req, res, next) => {

        if (res.headersSent) {
            return next(error);
        }

        const statusCode =
            Number.isInteger(error.statusCode) &&
            error.statusCode >= 400 &&
            error.statusCode < 600
                ? error.statusCode
                : 500;

        const isProduction =
            process.env.NODE_ENV === "production";

        const isJsonParseError =
            error?.type === "entity.parse.failed";

        const isPayloadTooLargeError =
            error?.type === "entity.too.large";

        let message = "Internal server error";

        if (isJsonParseError) {
            message = "Invalid JSON payload.";
        } else if (isPayloadTooLargeError) {
            message = "Request body too large.";
        } else if (statusCode >= 400 && statusCode < 500) {
            message = error.message || "Bad request.";
        }

        if (statusCode >= 500) {

            console.error(
                "Unhandled server error:",
                isProduction
                    ? error.message
                    : error
            );

        } else {

            console.warn(
                "Client request error:",
                {
                    method: req.method,
                    path: req.originalUrl,
                    statusCode,
                    type: error?.type
                }
            );

        }

        res.status(statusCode).json({
            success: false,
            message
        });

    }
);

/*==================================================
    Start Server
==================================================*/

async function startServer() {

    try {

        await connectDatabase();

        app.listen(
            PORT,
            () => {

                console.log(
                    `StreamFlix API running on http://localhost:${PORT}`
                );

                console.log(
                    `StreamFlix assets served from ${publicAssetsPath}`
                );

            }
        );

    } catch (error) {

        console.error(
            "StreamFlix server startup failed:",
            error.message
        );

        process.exit(1);

    }

}


export {
    app,
    startServer
};


if (
    process.argv[1] ===
    fileURLToPath(import.meta.url)
) {
    startServer();
}
