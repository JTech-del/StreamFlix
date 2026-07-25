"use strict";

/*==================================================
    Search Service

    Responsibility:
    Handles all movie searching logic.

==================================================*/
/*
import { HERO_DATA } from "../data/hero/heroData.js";
*/

import { HERO_DATA } from "../../data/hero/heroData.js";
class SearchService {

    constructor() {

        this.movies = HERO_DATA;

    }

    /*==============================================
        Search Movies
    ==============================================*/

    search(query) {

        const keyword = query.trim().toLowerCase();

        if (!keyword) {

            return [];

        }
        return this.movies
            .filter(movie => {

                return (

                    movie.title
                    .toLowerCase()
                    .includes(keyword)

                    ||

                    movie.genres.some(

                        genre => genre
                        .toLowerCase()
                        .includes(keyword)

                    )

                    ||

                    String(movie.year)
                    .includes(keyword)

                );

            })
            .slice(0, 6);

    }

    /*==============================================
        Get Movie
    ==============================================*/

    getMovie(slug) {

        return this.movies.find(

            movie => movie.slug === slug

        );

    }

}

export const searchService = new SearchService();