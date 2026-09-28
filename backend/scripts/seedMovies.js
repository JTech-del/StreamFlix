"use strict";

import "dotenv/config";

import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { importMovieFromTmdb } from "../src/services/tmdbMovieImportService.js";

const TMDB_MOVIE_IDS = [
    155,
    680,
    603,
    238,
    278,
    13,
    497,
    27205,
    157336,
    120,
    496243,
    396535,
    670,
    290098,
    11423,
    372058,
    129,
    4935,
    128,
    568160,
    20453,
    360814,
    579974,
    297222,
    19666,
    167073,
    194,
    423,
    101,
    637,
    11216,
    1417,
    411088,
    265195,
    598,
    146,
    79,
    10775,
    11104,
    582,
    103663,
    60243,
    373569,
    390989,
    548086,
    634528,
    724495,
    575299,
    505262,
    17654
];

async function seedMovies() {
    console.log("StreamFlix movie seeding started.");
    console.log(`Movies queued: ${TMDB_MOVIE_IDS.length}`);

    await connectDatabase();

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const tmdbId of TMDB_MOVIE_IDS) {
        try {
            console.log(`\nImporting TMDB movie ${tmdbId}...`);

            const result = await importMovieFromTmdb(tmdbId);

            if (result.action === "created") {
                created += 1;
                console.log(`Created movie for TMDB ID ${tmdbId}.`);
            } else if (result.action === "updated") {
                updated += 1;
                console.log(`Updated movie for TMDB ID ${tmdbId}.`);
            } else {
                console.log(
                    `TMDB ID ${tmdbId} completed with action: ${result.action}.`
                );
            }
        } catch (error) {
            failed += 1;

            console.error(
                `Failed to import TMDB ID ${tmdbId}:`,
                error.message
            );
        }
    }

    console.log("\n----------------------------------------");
    console.log("StreamFlix movie seeding completed.");
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed:  ${failed}`);
    console.log("----------------------------------------");
}

try {
    await seedMovies();
} catch (error) {
    console.error(
        "StreamFlix movie seeding aborted:",
        error.message
    );

    process.exitCode = 1;
} finally {
    await disconnectDatabase();
}


