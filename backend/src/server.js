import express from "express";
import config from "./config/config.js";
import { connectDatabase } from "./config/database.js";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";


import adminMovieRoutes from "./routes/adminMovieRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import trailerRoutes from "./routes/trailerRoutes.js";
import tmdbRoutes from "./routes/tmdbRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";

/*==================================================
    StreamFlix Backend Server
==================================================*/

const app = express();

const PORT = config.port;


/*==================================================
    Resolve Project Paths
==================================================*/

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);


/*
    backend/src/server.js

    Go up:

    server.js
        ↓
    src
        ↓
    backend
        ↓
    streamFlix

    Then enter:

    public/assets
*/

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
    Middleware
==================================================*/

app.use(cors());

app.use(express.json());


/*==================================================
    Static Media
==================================================*/

/*
    This allows:

    /assets/images/posters/image.jpg

    to resolve to:

    /public/assets/images/posters/image.jpg
*/

app.use(
    "/assets",
    express.static(publicAssetsPath)
);


/*==================================================
    Health Check
==================================================*/

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        message: "StreamFlix API is running"

    });

});


/*==================================================
    Movie Routes
==================================================*/

app.use("/api/auth", authRoutes);

app.use(
    "/api/sessions",
    sessionRoutes
);

app.use("/api", movieRoutes);

/*==================================================*/
app.use(
    "/api/admin",
    adminMovieRoutes
);
/*==================================================
    TMDB Routes
==================================================*/

app.use(
    "/api/tmdb",
    tmdbRoutes
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
    Start Server
==================================================*/

async function startServer() {

    try {

        /*------------------------------------------
            Connect To MongoDB
        ------------------------------------------*/

        await connectDatabase();


        /*------------------------------------------
            Start HTTP Server
        ------------------------------------------*/

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


startServer();



