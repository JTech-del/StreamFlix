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

        logo: "/assets/images/logo/image-2.jpg",

        backdrop: "/assets/images/backdrop/image-2.jpg",

        poster: "/assets/images/posters/image-2.jpg",

        video: "/assets/videos/movies/Blood_Sisters_S01E03_-_The_Hunt____NetNaija - Copy.mp4",

        trailer: "/assets/videos/trailers/Blood_Sisters_S01E03_-_The_Hunt____NetNaija - Copy.mp4",

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



        slug: "No-one-will-save-you",

        title: "No One Will Save You",

        logo: "/assets/images/logo/image.jpg",

        backdrop: "/assets/images/backdrop/image.jpg",

        poster: "/assets/images/posters/image.jpg",

        video: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

        trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

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

    }),


    Object.freeze({
        id: 3,

        slug: "gotham",

        title: "Gotham Season 2",

        logo: "/assets/images/logo/image-6.jpg",

        backdrop: "/assets/images/backdrop/image-6.jpg",

        thumbnail: "image/thumb3.jpg",

        poster: "/assets/images/posters/image-6.jpg",

        video: "/assets/videos/movies/Gotham.S05E02.(THENKIRI.COM).mkv",

        trailer: "/assets/videos/trailers/Gotham.S05E02.(THENKIRI.COM).mkv",

        year: 2025,

        duration: "43m",

        rating: "PG-18",

        imdb: 8.8,

        quality: "4K",

        genres: Object.freeze([
            "Action",
            "Trailer",
            "Drama"
        ]),

        description: "A solitary woman living on the outskirts of town must survive a terrifying extraterrestrial invasion that forces her to confront her past.",

        featured: true

    }),


    Object.freeze({
        id: 4,

        slug: "Peaky Blinders",

        title: "Peaky Blinders",

        logo: "/assets/images/logo/image-3.jpg",

        backdrop: "/assets/images/backdrop/image-3.jpg",

        thumbnail: "image/thumb3.jpg",

        poster: "/assets/images/posters/image-3.jpg",

        video: "/assets/videos/movies/Gotham.S05E02.(THENKIRI.COM).mkv",

        trailer: "/assets/videos/trailers/Gotham.S05E02.(THENKIRI.COM).mkv",

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

    }),

    Object.freeze({

        id: 5,

        slug: "The Sea ",

        title: "The Sea",

        logo: "/assets/images/logo/image1.jpg",

        backdrop: "/assets/images/backdrop/image1.jpg",

        poster: "/assets/images/posters/image1.jpg",

        video: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

        trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

        year: 2023,

        duration: "1h 48m",

        rating: "PG-13",

        imdb: 8.8,

        quality: "4K",

        genres: Object.freeze([
            "Trialer",
            "Mystery"
        ]),

        description: "A solitary woman living on the outskirts of town must survive a terrifying extraterrestrial invasion that forces her to confront her past.",

        featured: true

    }),



    Object.freeze({

        id: 6,

        slug: "A man From Beyound",

        title: "A Man From Beyound",

        logo: "/assets/images/logo/image2.jpg",

        backdrop: "/assets/images/backdrop/image2.jpg",

        poster: "/assets/images/posters/image2.jpg",

        video: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

        trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

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

    }),



    Object.freeze({

        id: 7,

        slug: "The Last Monach",

        title: "The last Monach ",

        logo: "/assets/images/logo/image3.jpg",

        backdrop: "/assets/images/backdrop/image3.jpg",

        poster: "/assets/images/posters/image3.jpg",

        video: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

        trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",



        year: 2026,

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

    }),


];

export const HERO_DATA = Object.freeze(heroItems);




/**     NEW MOVIES *
Object.freeze({

    id: 8,

    slug: "iplic",

    title: "Blood Sisters",

    logo: "/assets/images/logo/image-2.jpg",

    backdrop: "/assets/images/backdrop/image-2.jpg",

    poster: "/assets/images/posters/image-2.jpg",

    trailer: "/assets/videos/trailers/Blood_Sisters_S01E03_-_The_Hunt____NetNaija - Copy.mp4",

    movie: "/assets/videos/movies/Blood_Sisters_S01E03_-_The_Hunt____NetNaija - Copy.mp4",

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

    id: 9,

    slug: "ijshsh",

    title: "No One Will Save You",

    logo: "/assets/images/logo/image.jpg",

    backdrop: "/assets/images/backdrop/image.jpg",

    poster: "/assets/images/posters/image.jpg",

    trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

    movie: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

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

}),


Object.freeze({
    id: 10,

    slug: "hjssj",

    title: "Gotham Season 2",

    logo: "/assets/images/logo/image-6.jpg",

    backdrop: "/assets/images/backdrop/image-6.jpg",

    thumbnail: "image/thumb3.jpg",

    poster: "/assets/images/posters/image-6.jpg",

    video: "/assets/videos/movies/Gotham.S05E02.(THENKIRI.COM).mkv",

    trailer: "/assets/videos/trailers/Gotham.S05E02.(THENKIRI.COM).mkv",


    movie: "/assets/videos/movies/Gotham.S05E02.(THENKIRI.COM).mkv",

    year: 2025,

    duration: "43m",

    rating: "PG-18",

    imdb: 8.8,

    quality: "4K",

    genres: Object.freeze([
        "Action",
        "Trailer",
        "Drama"
    ]),

    description: "A solitary woman living on the outskirts of town must survive a terrifying extraterrestrial invasion that forces her to confront her past.",

    featured: true

}),


Object.freeze({
    id: 11,

    slug: "jsjjs",

    title: "Peaky Blinders",

    logo: "/assets/images/logo/image-3.jpg",

    backdrop: "/assets/images/backdrop/image-3.jpg",

    thumbnail: "image/thumb3.jpg",

    poster: "/assets/images/posters/image-3.jpg",

    video: "/assets/videos/movies/Gotham.S05E02.(THENKIRI.COM).mkv",

    trailer: "/assets/videos/trailers/Gotham.S05E02.(THENKIRI.COM).mkv",


    movie: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

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

}),

Object.freeze({

    id: 12,

    slug: "uisjjsm",

    title: "The Sea",

    logo: "/assets/images/logo/image1.jpg",

    backdrop: "/assets/images/backdrop/image1.jpg",

    poster: "/assets/images/posters/image1.jpg",

    trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

    movie: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

    year: 2023,

    duration: "1h 48m",

    rating: "PG-13",

    imdb: 8.8,

    quality: "4K",

    genres: Object.freeze([
        "Trialer",
        "Mystery"
    ]),

    description: "A solitary woman living on the outskirts of town must survive a terrifying extraterrestrial invasion that forces her to confront her past.",

    featured: true

}),



Object.freeze({

    id: 13,

    slug: "jsjjsj",

    title: "Tokyo",

    logo: "/assets/images/logo/Tokyo.jpg",

    backdrop: "/assets/images/backdrop/Tokyo.jpg",

    poster: "/assets/images/posters/Tokyo.jpg",

    trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

    movie: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

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

}),



Object.freeze({

    id: 14,

    slug: "nsmksk",

    title: "Amazing SpiderMan",

    logo: "/assets/images/logo/Amazing SpiderMan (1).jpg",

    backdrop: "/assets/images/backdrop/Amazing SpiderMan (1).jpg",

    poster: "/assets/images/posters/Amazing SpiderMan (1).jpg",

    trailer: "/assets/videos/trailers/No_One_Will_Save_You - Copy.mp4",

    movie: "/assets/videos/movies/No_One_Will_Save_You - Copy.mp4",

    year: 2026,

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

}),
*/