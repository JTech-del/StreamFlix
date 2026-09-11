
"use strict";

/*==================================================
    StreamFlix

    Movie Model

    Responsibility:

    ✓ Define movie document structure
    ✓ Validate movie metadata
    ✓ Define media references
    ✓ Provide MongoDB indexes
    ✓ Prevent invalid movie records

    MongoDB Collection:

        movies
==================================================*/

import mongoose from "mongoose";


/*==================================================
    Media Schema

    Stores references to media files.

    Physical filesystem paths are NOT stored here.

    Example:

        video:
            "No_One_Will_Save_You - Copy.mp4"

        trailer:
            "trailer-001.mp4"
==================================================*/

const mediaSchema = new mongoose.Schema(
    {

        video: {
            type: String,
            default: null,
            trim: true
        },

        trailer: {
            type: String,
            default: null,
            trim: true
        },

        poster: {
            type: String,
            default: null,
            trim: true
        },

        backdrop: {
            type: String,
            default: null,
            trim: true
        },

        background: {
            type: String,
            default: null,
            trim: true
        },

        logo: {
            type: String,
            default: null,
            trim: true
        }

    },

    {
        _id: false
    }
);


/*==================================================
    Movie Schema
==================================================*/

const movieSchema = new mongoose.Schema(
    {

        /*------------------------------------------
            Legacy / Application Movie ID

            We keep this temporarily because the
            current frontend architecture uses
            numeric movie IDs.

            MongoDB's _id remains the true database
            identifier.
        ------------------------------------------*/

        id: {
            type: Number,
            required: true,
            unique: true,
            index: true,
            min: 1
        },


        /*------------------------------------------
            URL-Friendly Slug
        ------------------------------------------*/

        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true
        },


        /*------------------------------------------
            Movie Title
        ------------------------------------------*/

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },


        /*------------------------------------------
            Movie Description
        ------------------------------------------*/

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },


        /*------------------------------------------
            Release Year
        ------------------------------------------*/

        year: {
            type: Number,
            required: true,
            min: 1888,
            max: 3000
        },


        /*------------------------------------------
            Duration

            Examples:

                "1h 33m"
                "43m"
                "4 Episodes"
        ------------------------------------------*/

        duration: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },


        /*------------------------------------------
            Content Rating

            Examples:

                PG-13
                18+
                PG-18
        ------------------------------------------*/

        rating: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30
        },


        /*------------------------------------------
            IMDb Rating

            Optional because some movies may not
            have an IMDb score yet.
        ------------------------------------------*/

        imdb: {
            type: Number,
            default: null,
            min: 0,
            max: 10
        },


        /*------------------------------------------
            Video Quality

            Examples:

                HD
                Full HD
                4K
        ------------------------------------------*/

        quality: {
            type: String,
            default: "HD",
            trim: true,
            maxlength: 30
        },


        /*------------------------------------------
            Genres
        ------------------------------------------*/

        genres: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: 50
                }
            ],
            default: []
        },

        /*------------------------------------------
            External Metadata

            Stores references to external movie
            databases without replacing StreamFlix
            application identifiers or ratings.
        ------------------------------------------*/
external: {
    tmdbId: {
        type: Number,
        default: null,
        index: true
    },

    tmdbRating: {
        type: Number,
        default: null,
        min: 0,
        max: 10
    },

    imdbId: {
        type: String,
        default: null,
        trim: true
    },

    tmdbGenres: {
        type: [String],
        default: []
    }
},

        /*------------------------------------------
            Movie Media
        ------------------------------------------*/

        media: {
            type: mediaSchema,
            default: () => ({})
        },


        /*------------------------------------------
            Featured Movie

            Used by the homepage / hero / featured
            sections.
        ------------------------------------------*/

        featured: {
            type: Boolean,
            default: false,
            index: true
        },


        /*------------------------------------------
            Upcoming Movie
        ------------------------------------------*/

        upcoming: {
            type: Boolean,
            default: false,
            index: true
        },


        /*------------------------------------------
            Release Date

            Stored as a real Date when available.

            null means no specific release date
            has been assigned.
        ------------------------------------------*/

        releaseDate: {
            type: Date,
            default: null
        },


        /*------------------------------------------
            Publication State

            Allows us to control whether a movie
            should be visible to normal users.

            This will become important when the
            admin system is implemented.
        ------------------------------------------*/

        status: {
            type: String,
            enum: [
                "draft",
                "published",
                "archived"
            ],
            default: "draft",
            index: true
        }

    },

    {
        timestamps: true,

        collection: "movies"
    }
);


/*==================================================
    Indexes
==================================================*/

/*
    Useful for homepage/movie discovery queries.
*/

movieSchema.index({
    featured: 1,
    status: 1
});


/*
    Useful for upcoming movies.
*/

movieSchema.index({
    upcoming: 1,
    releaseDate: 1,
    status: 1
});


/*
    Useful for genre-based discovery.
*/

movieSchema.index({
    genres: 1,
    status: 1
});


/*==================================================
    Export Model
==================================================*/

const Movie = mongoose.model(
    "Movie",
    movieSchema
);


export default Movie;
