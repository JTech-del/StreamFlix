"use strict";

/*==================================================
    StreamFlix Footer Links

    Responsibility:

    ✓ Store footer navigation data
    ✓ Keep footer content separate from layout
    ✓ Provide reusable footer link groups

    Does NOT handle:

    ✗ DOM manipulation
    ✗ Rendering
    ✗ Navigation logic
    ✗ Business logic
==================================================*/


/*==================================================
    Footer Navigation
==================================================*/

export const footerLinks = Object.freeze({

    explore: Object.freeze([

        {
            label: "Home",
            href: "#"
        },

        {
            label: "Movies",
            href: "#"
        },

        {
            label: "New Releases",
            href: "#"
        },

        {
            label: "My List",
            href: "#"
        }

    ]),


    support: Object.freeze([

        {
            label: "Help Center",
            href: "#"
        },

        {
            label: "Contact Us",
            href: "#"
        },

        {
            label: "FAQ",
            href: "#"
        }

    ]),


    legal: Object.freeze([

        {
            label: "Terms of Use",
            href: "#"
        },

        {
            label: "Privacy Policy",
            href: "#"
        },

        {
            label: "Cookie Preferences",
            href: "#"
        }

    ])

});


/*==================================================
    Footer Social Links
==================================================*/

export const footerSocialLinks =
    Object.freeze([

        {
            label: "Facebook",
            icon: "facebook",
            href: "#"
        },

        {
            label: "Instagram",
            icon: "instagram",
            href: "#"
        },

        {
            label: "YouTube",
            icon: "youtube",
            href: "#"
        },

        {
            label: "Twitter",
            icon: "twitter",
            href: "#"
        }

    ]);


/*==================================================
    Footer Information
==================================================*/

export const footerInfo =
    Object.freeze({

        brand: "StreamFlix",

        description: "Stream your favorite movies and discover something new every day.",

        copyright: "© 2026 StreamFlix. All rights reserved."

    });


/*==================================================
    Public Export
==================================================*/

export default Object.freeze({

    links: footerLinks,

    social: footerSocialLinks,

    info: footerInfo

});