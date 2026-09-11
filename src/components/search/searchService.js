"use strict";

/*==================================================
    Search Service

    Responsibility:

    ✓ Stores movies supplied by backend
    ✓ Searches movie title
    ✓ Searches movie genres
    ✓ Searches movie year
    ✓ Returns matching movies

    Does NOT handle:

    ✗ HTTP requests
    ✗ DOM rendering
    ✗ UI state
    ✗ Event handling

==================================================*/


class SearchService {

    constructor() {

        /*
            Movies are supplied by the
            SearchController.

            The backend is now the
            source of truth.
        */

        this.movies = [];

    }


    /*==============================================
        Set Movies
    ==============================================*/

    setMovies(movies = []) {

        this.movies =
            Array.isArray(movies)

        ?
        movies

            : [];


        console.log(
            "SearchService movies:",
            this.movies.length
        );

    }


    /*==============================================
        Get Movies
    ==============================================*/

    getMovies() {

        return this.movies;

    }


    /*==============================================
        Search Movies
    ==============================================*/

    search(query) {

        const keyword =
            query
            .trim()
            .toLowerCase();


        /*------------------------------
            Empty Search
        ------------------------------*/

        if (!keyword) {

            return [];

        }


        /*------------------------------
            Search Movies
        ------------------------------*/

        return this.movies

            .filter(movie => {

            /*--------------------------
                Title
            --------------------------*/

            const title =
                String(
                    movie.title || ""
                )
                .toLowerCase();


            /*--------------------------
                Genres
            --------------------------*/

            const genres =
                Array.isArray(
                    movie.genres
                )

            ?
            movie.genres

                : [];


            const genreMatch =
                genres.some(

                    genre =>

                    String(genre)
                    .toLowerCase()
                    .includes(keyword)

                );


            /*--------------------------
                Year
            --------------------------*/

            const yearMatch =

                String(
                    movie.year || ""
                )
                .includes(keyword);


            /*--------------------------
                Final Match
            --------------------------*/

            return (

                title.includes(keyword)

                ||

                genreMatch

                ||

                yearMatch

            );

        })


        /*------------------------------
            Limit Results
        ------------------------------*/

        .slice(0, 6);

    }


    /*==============================================
        Get Movie
    ==============================================*/

    getMovie(slug) {

        if (!slug) {

            return null;

        }


        return this.movies.find(

            movie =>

            movie.slug === slug

        ) || null;

    }


    /*==============================================
        Get Movie By ID
    ==============================================*/

    getMovieById(movieId) {

        if (!movieId) {

            return null;

        }


        const numericId =
            Number(movieId);


        return this.movies.find(

            movie =>

            Number(movie.id) === numericId

        ) || null;

    }

}


export const searchService =
    new SearchService();