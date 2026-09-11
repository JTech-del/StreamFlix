"use strict";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const __filename = fileURLToPath(
    import.meta.url
);

const __dirname = path.dirname(
    __filename
);


const moviesPath = path.resolve(
    __dirname,
    "../../data/movies.json"
);


/*==================================================
    Get All Movies
==================================================*/

export async function getMovies() {

    const data = await fs.readFile(
        moviesPath,
        "utf-8"
    );

    return JSON.parse(data);

}


/*==================================================
    Get Upcoming Movies
==================================================*/

export async function getUpcomingMovies() {

    const movies =
        await getMovies();


    return movies.filter(
        movie =>
        movie.upcoming === true
    );

}


/*==================================================
    Get Movie By ID
==================================================*/

export async function getMovieById(movieId) {

    const movies =
        await getMovies();


    const numericMovieId =
        Number(movieId);


    return movies.find(
        movie =>
        movie.id === numericMovieId
    );

}