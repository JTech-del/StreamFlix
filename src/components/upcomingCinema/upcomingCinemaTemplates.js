"use strict";

/*==================================================
    StreamFlix

    Upcoming Cinema Templates

    Responsibility:

    ✓ Section structure
    ✓ Cinematic background preview
    ✓ Movie information
    ✓ Existing Watch Trailer action
    ✓ Trailer Rail child-component mount
    ✓ Accessibility hooks

    Does NOT handle:

    ✗ Video playback
    ✗ Trailer rotation
    ✗ Events
    ✗ Application state
    ✗ Mini Theatre
    ✗ Trailer business logic
==================================================*/


export const upcomingCinemaTemplates = {


        /*==================================================
            Section
        ==================================================*/

        section(movie) {

            return `

        <section
            class="upcoming-cinema"
            aria-labelledby="upcoming-cinema-title"
        >


            <!--========================================
                Section Header
            ========================================-->

            <header
                class="upcoming-cinema__header"
            >

                <div>

                    <h2
                        id="upcoming-cinema-title"
                        class="upcoming-cinema__title"
                    >
                        Upcoming Cinema
                    </h2>


                    <p
                        class="upcoming-cinema__subtitle"
                    >
                        Get a first look at what's
                        coming to StreamFlix.
                    </p>

                </div>

            </header>



            <!--========================================
                Cinematic Preview Container
            ========================================-->

            <div
                class="upcoming-cinema__container"
            >


                <!--====================================
                    Background Trailer Preview
                ====================================-->

                <div
                    class="upcoming-cinema__preview"
                    data-upcoming-preview
                >

                    <video
                        class="upcoming-cinema__video"
                        src="${movie.trailerUrl || ""}"
                        muted
                        autoplay
                        loop
                        playsinline
                        preload="auto"
                        aria-label="${
                            movie.title ||
                            "Upcoming movie"
                        } trailer preview"
                    ></video>



                    <!--================================
                        Cinematic Overlay
                    ==================================-->

                    <div
                        class="upcoming-cinema__overlay"
                    >


                        <!--================================
                            Movie Information
                        ==================================-->

                        <div
                            class="upcoming-cinema__content"
                        >

                            <div
                                class="upcoming-cinema__info"
                            >


                                <!-- Movie Title -->

                                <h3
                                    class="upcoming-cinema__movie-title"
                                >
                                    ${movie.title || ""}
                                </h3>



                                <!--================================
                                    Metadata
                                ==================================-->

                                <div
                                    class="upcoming-cinema__metadata"
                                    aria-label="Movie information"
                                >

                                    ${
                                        movie.year
                                            ? `
                                                <span>
                                                    ${movie.year}
                                                </span>
                                              `
                                            : ""
                                    }


                                    ${
                                        movie.duration
                                            ? `
                                                <span
                                                    aria-hidden="true"
                                                >
                                                    •
                                                </span>

                                                <span>
                                                    ${movie.duration}
                                                </span>
                                              `
                                            : ""
                                    }


                                    ${
                                        movie.rating
                                            ? `
                                                <span
                                                    aria-hidden="true"
                                                >
                                                    •
                                                </span>

                                                <span>
                                                    ${movie.rating}
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>



                                <!--================================
                                    Description
                                ==================================-->

                                ${
                                    movie.description
                                        ? `
                                            <p
                                                class="upcoming-cinema__description"
                                            >
                                                ${movie.description}
                                            </p>
                                          `
                                        : ""
                                }



                                <!--================================
                                    Release Date
                                ==================================-->

                                ${
                                    movie.releaseDate
                                        ? `
                                            <p
                                                class="upcoming-cinema__release"
                                            >
                                                Coming
                                                ${movie.releaseDate}
                                            </p>
                                          `
                                        : ""
                                }



                                <!--================================
                                    EXISTING WATCH TRAILER

                                    IMPORTANT:
                                    This remains the established
                                    Upcoming Cinema control.
                                ==================================-->

                                <button
                                    type="button"
                                    class="upcoming-cinema__watch"
                                    data-action="watch-trailer"
                                    data-upcoming-id="${movie.id}"
                                    ${
                                        movie.trailerUrl
                                            ? ""
                                            : "disabled"
                                    }
                                >

                                    <span
                                        aria-hidden="true"
                                    >
                                        ▶
                                    </span>

                                    ${
                                        movie.trailerUrl
                                            ? "Watch Trailer"
                                            : "Trailer Unavailable"
                                    }

                                </button>


                            </div>

                        </div>

                    </div>



                    <!--====================================
                        Bottom Gradient
                    ====================================-->

                    <div
                        class="upcoming-cinema__bottom-gradient"
                        aria-hidden="true"
                    ></div>



                    <!--====================================
                        TRAILER RAIL CHILD COMPONENT MOUNT

                        IMPORTANT:

                        This is ONLY the mount point.

                        TrailerRailView will render the
                        actual cards and controls here.

                        It remains INSIDE Upcoming Cinema.
                    ====================================-->

                    <div
                        class="upcoming-cinema__trailer-rail"
                        data-trailer-rail-mount
                        aria-label="Upcoming movie trailers"
                    ></div>


                </div>

            </div>

        </section>

        `;

    },


    /*==================================================
        Empty State
    ==================================================*/

    emptyState() {

        return `

            <section
                class="upcoming-cinema"
                aria-labelledby="upcoming-cinema-title"
            >


                <!--====================================
                    Header
                ====================================-->

                <header
                    class="upcoming-cinema__header"
                >

                    <div>

                        <h2
                            id="upcoming-cinema-title"
                            class="upcoming-cinema__title"
                        >
                            Upcoming Cinema
                        </h2>


                        <p
                            class="upcoming-cinema__subtitle"
                        >
                            Get a first look at what's
                            coming to StreamFlix.
                        </p>

                    </div>

                </header>



                <!--====================================
                    Empty State
                ====================================-->

                <div
                    class="upcoming-cinema__empty"
                    role="status"
                >

                    <h3>
                        No upcoming trailers available
                    </h3>


                    <p>
                        Check back soon for new trailers.
                    </p>

                </div>


            </section>

        `;

    }

};