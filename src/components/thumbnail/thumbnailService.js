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

        console.log(
            "Service movies:",
            this.movies.length
        );

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
        /*==============================================
    Get Movie Index
==============================================*/

    getMovieIndex(slug) {

        return this.movies.findIndex(

            movie => movie.slug === slug

        );

    }


    /*==============================================
        Previous Movie
    ==============================================*/

    getPreviousMovie(slug) {

        const index = this.getMovieIndex(slug);

        if (index <= 0) {

            return null;

        }

        return this.movies[index - 1];

    }


    /*==============================================
        Next Movie
    ==============================================*

    getNextMovie(slug) {

        const index = this.getMovieIndex(slug);

        if (

            index === -1 ||

            index >= this.movies.length - 1

        ) {

            return null;

        }

        return this.movies[index + 1];

    }
        */

    /**DEBUG TEMPORAL  */
    getNextMovie(slug) {

        console.log("Slug:", slug);

        const index = this.getMovieIndex(slug);

        console.log("Index:", index);

        console.log(
            "Total Movies:",
            this.movies.length
        );

        console.log(
            "Current Movie:",
            this.movies[index]
        );

        console.log(
            "Next Movie:",
            this.movies[index + 1]
        );

        if (

            index === -1 ||

            index >= this.movies.length - 1

        ) {

            return null;

        }

        return this.movies[index + 1];

    }


}

export const thumbnailService = new ThumbnailService();