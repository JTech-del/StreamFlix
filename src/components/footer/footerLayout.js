"use strict";

/*==================================================
    StreamFlix Footer Layout

    Responsibility:

    ✓ Generate footer structure
    ✓ Generate footer navigation groups
    ✓ Generate social links
    ✓ Generate footer information
    ✓ Maintain semantic HTML

    Does NOT handle:

    ✗ DOM manipulation
    ✗ Event handling
    ✗ Navigation logic
    ✗ Business logic
==================================================*/


import {

    footerLinks,

    footerSocialLinks,

    footerInfo

} from "../../data/footerLinks.js";


/*==================================================
    Footer Layout
==================================================*/

export function footerLayout() {


    /*==============================================
        Navigation Groups
    ==============================================*/

    const exploreLinks =
        footerLinks.explore
        .map(

            link => `

                    <li class="footer__item">

                        <a

                            class="footer__link"

                            href="${link.href}"

                        >

                            ${link.label}

                        </a>

                    </li>

                `

        )
        .join("");


    const supportLinks =
        footerLinks.support
        .map(

            link => `

                    <li class="footer__item">

                        <a

                            class="footer__link"

                            href="${link.href}"

                        >

                            ${link.label}

                        </a>

                    </li>

                `

        )
        .join("");


    const legalLinks =
        footerLinks.legal
        .map(

            link => `

                    <li class="footer__item">

                        <a

                            class="footer__link"

                            href="${link.href}"

                        >

                            ${link.label}

                        </a>

                    </li>

                `

        )
        .join("");


    /*==============================================
        Social Links
    ==============================================*/

    const socialLinks =
        footerSocialLinks
        .map(

            social => `

                    <a

                        class="footer__social"

                        href="${social.href}"

                        aria-label="${social.label}"

                        title="${social.label}"

                    >

                        <i

                            data-lucide="${social.icon}"

                            aria-hidden="true"

                        ></i>

                    </a>

                `

        )
        .join("");


    /*==============================================
        Footer
    ==============================================*/

    return `

        <footer

            class="footer"

            aria-label="StreamFlix footer"

        >


            <!--==================================
                Main Footer
            ==================================-->

            <div class="footer__container">


                <!--================================
                    Brand
                =================================-->

                <div class="footer__brand">


                    <a

                        href="#"

                        class="footer__logo"

                        aria-label="${footerInfo.brand} home"

                    >

                        <span

                            class="footer__logo-mark"

                            aria-hidden="true"

                        >

                            SF

                        </span>


                        <span

                            class="footer__logo-text"

                        >

                            ${footerInfo.brand}

                        </span>

                    </a>


                    <p

                        class="footer__description"

                    >

                        ${footerInfo.description}

                    </p>


                    <!--============================
                        Social Links
                    =============================-->

                    <div

                        class="footer__socials"

                        aria-label="Social media"

                    >

                        ${socialLinks}

                    </div>


                </div>


                <!--================================
                    Navigation
                =================================-->

                <nav

                    class="footer__navigation"

                    aria-label="Footer navigation"

                >


                    <!--============================
                        Explore
                    =============================-->

                    <div class="footer__group">

                        <h3

                            class="footer__group-title"

                        >

                            Explore

                        </h3>


                        <ul

                            class="footer__list"

                        >

                            ${exploreLinks}

                        </ul>

                    </div>


                    <!--============================
                        Support
                    =============================-->

                    <div class="footer__group">

                        <h3

                            class="footer__group-title"

                        >

                            Support

                        </h3>


                        <ul

                            class="footer__list"

                        >

                            ${supportLinks}

                        </ul>

                    </div>


                    <!--============================
                        Legal
                    =============================-->

                    <div class="footer__group">

                        <h3

                            class="footer__group-title"

                        >

                            Legal

                        </h3>


                        <ul

                            class="footer__list"

                        >

                            ${legalLinks}

                        </ul>

                    </div>


                </nav>


            </div>


            <!--==================================
                Footer Bottom
            ==================================-->

            <div class="footer__bottom">


                <div

                    class="footer__bottom-container"

                >


                    <p

                        class="footer__copyright"

                    >

                        ${footerInfo.copyright}

                    </p>


                    <p

                        class="footer__tagline"

                    >

                        Built for movie lovers.

                    </p>


                </div>


            </div>


        </footer>

    `;

}


/*==================================================
    Public Export
==================================================*/

export default footerLayout;