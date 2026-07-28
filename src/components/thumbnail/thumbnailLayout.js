"use strict";

/*==================================================
    Thumbnail Layout

    Responsibility:
    Returns the HTML structure for the
    StreamFlix Thumbnail component.

==================================================*/

export function thumbnailLayout() {

    return `
    
<section class="thumbnail" aria-label="Trending Movies">

    <div class="thumbnail__container">

        <!-- Section Header -->

        <div class="thumbnail__header">

            <h2 class="thumbnail__heading">

                Trending Now

            </h2>

        </div>

        <!-- Thumbnail Slider -->

        <div class="thumbnail__slider">

            <!-- Previous Button -->

            <button
                class="thumbnail__button thumbnail__button--prev"
                type="button"
                aria-label="Previous Movies"
            >

                <i data-lucide="chevron-left"></i>

            </button>

            <!-- Track -->

            <div class="thumbnail__viewport">

                <div class="thumbnail__track">

                    <!-- Movie Cards Render Here -->

                </div>

            </div>

            <!-- Next Button -->

            <button
                class="thumbnail__button thumbnail__button--next"
                type="button"
                aria-label="Next Movies"
            >

                <i data-lucide="chevron-right"></i>

            </button>

        </div>

    </div>

</section>

`;

}