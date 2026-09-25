"use strict";

/*==================================================
    StreamFlix

    Role Authorization Middleware

    Responsibility:

    ✓ Enforce authenticated user roles
    ✓ Allow one or more permitted roles
    ✓ Reject users without sufficient authorization

    Does NOT handle:

    ✗ JWT verification
    ✗ Authentication
    ✗ Session persistence
    ✗ Database lookups
==================================================*/

export function requireRole(
    ...allowedRoles
) {

    return function roleAuthorization(
        req,
        res,
        next
    ) {

        /*------------------------------------------
            Authentication Must Already Exist
        ------------------------------------------*/

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        /*------------------------------------------
            Validate Required Roles
        ------------------------------------------*/

        if (
            allowedRoles.length === 0 ||
            !allowedRoles.includes(
                req.user.role
            )
        ) {

            return res.status(403).json({

                success: false,

                message: "Insufficient permissions."

            });

        }


        /*------------------------------------------
            Authorization Successful
        ------------------------------------------*/

        return next();

    };

}
