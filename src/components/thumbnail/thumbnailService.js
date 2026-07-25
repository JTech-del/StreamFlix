"use strict";

/*==================================================
    Thumbnail Service

    Responsibility:
    Provides movie data for the
    Thumbnail component.

==================================================*/

import { HERO_DATA } from "../../data/hero/heroData.js";

class ThumbnailService {

    constructor() {

        this.movies = HERO_DATA;

    }

    /*==============================================
        Get All Movies
    ==============================================*/

    getMovies() {

        return this.movies;

    }

    /*==============================================
        Get Featured Movie
    ==============================================*/

    getFeaturedMovie() {

        return this.movies.find(

            movie => movie.featured

        );

    }

    /*==============================================
        Get Movie By Slug
    ==============================================*/

    getMovie(slug) {

        return this.movies.find(

            movie => movie.slug === slug

        );

    }

    /*==============================================
        Get Movie By Index
    ==============================================*/


    getMovieByIndex(index) {

            if (index < 0 || index >= this.movies.length) {

                return null;

            }

            return this.movies[index];

        }
        /*==============================================
            Get Total Movies
        ==============================================*/

    getTotalMovies() {

        return this.movies.length;

    }

}

export const thumbnailService = new ThumbnailService();