"use strict";

/*==================================================
    Hero Data

    Description:
    Featured showcase content for StreamFlix.

    Notes:
    - Object.freeze() protects the top-level array.
    - Each hero object is also frozen.
==================================================*/

const heroItems = [

    Object.freeze({

        id: 1,

        slug: "blood-sisters",

        title: "Blood Sisters",

        logo: "assets/images/logos/blood-sisters.png",

        backdrop: "assets/images/backgrounds/blood-sisters.jpg",

        poster: "assets/images/posters/blood-sisters.jpg",

        trailer: "assets/videos/trailers/blood-sisters.mp4",

        movie: "assets/videos/movies/blood-sisters.mp4",

        year: 2022,

        duration: "4 Episodes",

        rating: "18+",

        imdb: 6.6,

        quality: "HD",

        genres: Object.freeze([
            "Crime",
            "Drama",
            "Thriller"
        ]),

        description: "Bound by friendship and trapped by a dangerous secret, two best friends find themselves hunted after a powerful family becomes their greatest enemy.",

        featured: true

    }),

    Object.freeze({

        id: 2,

        slug: "no-one-will-save-you",

        title: "No One Will Save You",

        logo: "assets/images/logos/no-one-will-save-you.png",

        backdrop: "assets/images/backgrounds/no-one-will-save-you.jpg",

        poster: "assets/images/posters/no-one-will-save-you.jpg",

        trailer: "assets/videos/trailers/no-one-will-save-you.mp4",

        movie: "assets/videos/movies/no-one-will-save-you.mp4",

        year: 2023,

        duration: "1h 33m",

        rating: "PG-13",

        imdb: 6.8,

        quality: "4K",

        genres: Object.freeze([
            "Sci-Fi",
            "Horror",
            "Mystery"
        ]),

        description: "A solitary woman living on the outskirts of town must survive a terrifying extraterrestrial invasion that forces her to confront her past.",

        featured: true

    })

];

export const HERO_DATA = Object.freeze(heroItems);