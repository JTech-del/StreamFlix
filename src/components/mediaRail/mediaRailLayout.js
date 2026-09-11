"use strict";

/*==================================================
StreamFlix Media Rail Layout

```
Responsibility:

✓ Generate shared Media Rail structure
✓ Generate rail heading
✓ Generate navigation controls
✓ Provide shared data attributes
✓ Maintain identical structure for every rail

Does NOT handle:

✗ Movie rendering
✗ Movie business logic
✗ Playback
✗ Download logic
✗ My List state
```

==================================================*/

/*==================================================
Media Rail Attributes
==================================================*/

export const mediaRailAttributes =
    Object.freeze({


        slug: "data-movie-slug",

        index: "data-index",

        id: "data-movie-id"

    });



/*==================================================
Media Rail Layout
==================================================*/

export function mediaRailLayout({


    title = "More Movies",

    ariaLabel = "More movies"


} = {}) {


    return `

    <section

        class="mediaRail"

        aria-label="${ariaLabel}"

    >

        <!--======================================
            Rail Header
        =======================================-->

        <header class="mediaRail__header">

            <h2 class="mediaRail__heading">

                ${title}

            </h2>


            <!--==================================
                Navigation
            ==================================-->

            <div class="mediaRail__navigation">

                <!--==============================
                    Previous
                ===============================-->

                <button

                    type="button"

                    class="mediaRail__button
                           mediaRail__button--prev"

                    data-rail-action="previous"

                    aria-label="Previous movies"

                    title="Previous"

                >

                    <i

                        data-lucide="chevron-left"

                        aria-hidden="true"

                    ></i>

                </button>


                <!--==============================
                    Next
                ===============================-->

                <button

                    type="button"

                    class="mediaRail__button
                           mediaRail__button--next"

                    data-rail-action="next"

                    aria-label="Next movies"

                    title="Next"

                >

                    <i

                        data-lucide="chevron-right"

                        aria-hidden="true"

                    ></i>

                </button>

            </div>

        </header>


        <!--======================================
            Rail Slider
        =======================================-->

        <div class="mediaRail__slider">


            <!--==================================
                Previous Edge
            ==================================-->

            <div class="mediaRail__edge
                        mediaRail__edge--left">

            </div>


            <!--==================================
                Viewport
            ==================================-->

            <div

                class="mediaRail__viewport"

                tabindex="0"

                role="region"

                aria-label="${ariaLabel} carousel"

            >

                <!--==============================
                    Track
                ===============================-->

                <div

                    class="mediaRail__track"

                    role="list"

                >

                </div>

            </div>


            <!--==================================
                Next Edge
            ==================================-->

            <div class="mediaRail__edge
                        mediaRail__edge--right">

            </div>


        </div>

    </section>

`;


}

/*==================================================
Public Export
==================================================*/

export default mediaRailLayout;