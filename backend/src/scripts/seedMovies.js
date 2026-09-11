
"use strict";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import Movie from "../models/Movie.js";

const movies = [
    {
        id: 1,
        slug: "blood-sisters",
        title: "Blood Sisters",
        description: "Four best friends are drawn into a dangerous web of secrets, crime, and betrayal after a wedding takes a dark turn.",
        year: 2022,
        duration: "4 Episodes",
        rating: "18+",
        imdb: null,
        quality: "HD",
        genres: ["Crime", "Drama", "Thriller"],
        media: {
            video: "movie-001.mp4",
            trailer: "trailer-001.mp4",
            poster: "image-2.jpg",
            backdrop: "image-2.jpg",
            background: "image-2.jpg",
            logo: "image-2.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    },

    {
        id: 2,
        slug: "no-one-will-save-you",
        title: "No One Will Save You",
        description: "A young woman living alone must confront an extraterrestrial threat while battling the isolation of her own past.",
        year: 2023,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
     genres: ["Sci-Fi", "Horror", "Mystery"],

external: {
    tmdbId: 820609,
    tmdbRating: 6.712,
    imdbId: "tt14509110"
},


        media: {
            video: "movie-002.mp4",
            trailer: "trailer-002.mp4",
            poster: "image.jpg",
            backdrop: "image.jpg",
            background: "image.jpg",
            logo: "image.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    },

    {
        id: 3,
        slug: "gotham-season-2",
        title: "Gotham Season 2",
        description: "Gotham descends further into chaos as its heroes and villains fight for control of the city.",
        year: 2026,
        duration: "43m",
        rating: "PG-18",
        imdb: null,
        quality: "HD",
        genres: ["Action", "Drama", "Thriller"],
        media: {
            video: "movie-002.mp4",
            trailer: "trailer-003.mkv",
            poster: "image-6.jpg",
            backdrop: "image-6.jpg",
            background: "image-6.jpg",
            logo: "image-6.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: new Date("2026-10-24"),
        status: "published"
    },

    {
        id: 4,
        slug: "peaky-blinders",
        title: "Peaky Blinders",
        description: "The Shelby family navigates crime, power, politics, and betrayal while expanding their influence.",
        year: 2026,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Crime", "Drama", "Thriller"],
        media: {
            video: null,
            trailer: "trailer-002.mp4",
            poster: "image-3.jpg",
            backdrop: "image-3.jpg",
            background: "image-3.jpg",
            logo: "image-3.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: new Date("2026-10-02"),
        status: "published"
    },

    {
        id: 5,
        slug: "the-sea",
        title: "The Sea",
        description: "A mysterious journey into the unknown forces a group of people to confront secrets buried beneath the surface.",
        year: 2023,
        duration: "1h 48m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Drama", "Mystery"],
        media: {
            video: null,
            trailer: "trailer-003.mkv",
            poster: "Image1.jpg",
            backdrop: "Image1.jpg",
            background: "Image1.jpg",
            logo: "Image1.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    },

    {
        id: 6,
        slug: "a-man-from-beyond",
        title: "A Man From Beyond",
        description: "A mysterious man from another time arrives with secrets that challenge everything those around him believe.",
        year: 2023,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Sci-Fi", "Horror", "Mystery"],
        media: {
            video: null,
            trailer: "trailer-001.mp4",
            poster: "image2.jpg",
            backdrop: "image2.jpg",
            background: "image2.jpg",
            logo: "image2.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    },

    {
        id: 7,
        slug: "the-last-monarch",
        title: "The Last Monarch",
        description: "A fallen kingdom must find a new leader when an unexpected heir rises to reclaim the throne.",
        year: 2026,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Drama", "Action", "Adventure"],
        media: {
            video: null,
            trailer: "trailer-001.mp4",
            poster: "image3.jpg",
            backdrop: "image3.jpg",
            background: "image3.jpg",
            logo: "image3.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: new Date("2026-09-15"),
        status: "published"
    },

    {
        id: 8,
        slug: "tokyo",
        title: "Tokyo",
        description: "A dramatic mystery unfolds through the streets of Tokyo as hidden relationships and dangerous secrets collide.",
        year: 2023,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Drama", "Mystery", "Thriller"],
        media: {
            video: null,
            trailer: "trailer-002.mp4",
            poster: "Tokyo.jpg",
            backdrop: "Tokyo.jpg",
            background: "Tokyo.jpg",
            logo: "Tokyo.jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    },

    {
        id: 9,
        slug: "amazing-spider-man",
        title: "Amazing Spider-Man",
        description: "A young hero discovers extraordinary abilities and must learn what it means to use them responsibly.",
        year: 2026,
        duration: "1h 33m",
        rating: "PG-13",
        imdb: null,
        quality: "HD",
        genres: ["Action", "Adventure", "Drama"],
        media: {
            video: null,
            trailer: "trailer-003.mkv",
            poster: "Amazing SpiderMan (1).jpg",
            backdrop: "Amazing SpiderMan (1).jpg",
            background: "Amazing SpiderMan (1).jpg",
            logo: "Amazing SpiderMan (1).jpg"
        },
        featured: true,
        upcoming: true,
        releaseDate: null,
        status: "published"
    }
];

async function seedMovies() {
    try {
        console.log("Starting StreamFlix movie seed...");

        await connectDatabase();

        const operations = movies.map((movie) => ({
            updateOne: {
                filter: { id: movie.id },
                update: {
                    $set: movie
                },
                upsert: true
            }
        }));

        const result = await Movie.bulkWrite(operations);

        console.log("Movie seed completed successfully.");
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
        console.log(`Inserted: ${result.upsertedCount}`);
        console.log(`Total catalogue records: ${movies.length}`);
    } catch (error) {
        console.error("Movie seed failed:", error);
        process.exitCode = 1;
    } finally {
        await disconnectDatabase();
    }
}

seedMovies();
