"use strict";

/*==================================================
    Subtitle Service

    Responsibility:

    ✓ Provides subtitle tracks
    ✓ Returns available languages
    ✓ Returns the active subtitle track

==================================================*/

class SubtitleService {

    constructor() {

        this.tracks = [];

    }

    /*==============================================
    Load Tracks
==============================================*/

    loadTracks(movie) {

        if (!movie) {

            this.tracks = [];

            return [];

        }

        this.tracks = movie.subtitles || [];

        return this.tracks;

    }

    /*==============================================
        Get Tracks
    ==============================================*/

    getTracks() {

            return this.tracks;

        }
        /*==============================================
            Get Track
        ==============================================*/

    getTrack(language) {

            return this.tracks.find(

                track => track.language === language

            );

        }
        /*==============================================
            Get Languages
        ==============================================*/

    getLanguages() {

        return this.tracks.map(

            track => track.language

        );

    }

}

export const subtitleService =
    new SubtitleService();