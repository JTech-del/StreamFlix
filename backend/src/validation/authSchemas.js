"use strict";

/*==================================================
    StreamFlix

    Authentication Validation Schemas

    Responsibility:

    ✓ Validate registration input
    ✓ Validate login input
    ✓ Validate refresh-token input
    ✓ Normalize email input
    ✓ Enforce password requirements

    Important:

    Validation protects the API boundary.

    Authentication and authorization decisions
    remain inside the authentication layer.
==================================================*/

import { z } from "zod";


/*==================================================
    Shared Fields
==================================================*/

const emailSchema = z
    .string()
    .trim()
    .email("A valid email address is required.")
    .max(254)
    .transform(
        (email) => email.toLowerCase()
    );


const passwordSchema = z
    .string()
    .min(
        8,
        "Password must contain at least 8 characters."
    )
    .max(
        128,
        "Password must not exceed 128 characters."
    );


/*==================================================
    Registration
==================================================*/

export const registerSchema =
    z.object({

        email: emailSchema,

        password: passwordSchema

    });


/*==================================================
    Login
==================================================*/

export const loginSchema =
    z.object({

        email: emailSchema,

        password: z
            .string()
            .min(
                1,
                "Password is required."
            )
            .max(
                128,
                "Password must not exceed 128 characters."
            )

    });


/*==================================================
    Refresh Token
==================================================*/

export const refreshTokenSchema =
    z.object({

        refreshToken: z
            .string()
            .min(
                1,
                "Refresh token is required."
            )

    });

    /*==================================================
    Logout
==================================================*/

export const logoutSchema =
    z.object({

        refreshToken: z
            .string()
            .min(
                1,
                "Refresh token is required."
            )

    });

/*==================================================
    Forgot Password
==================================================*/

export const forgotPasswordSchema =
    z.object({

        email: emailSchema

    });


/*==================================================
    Password Reset
==================================================*/

export const resetPasswordSchema =
    z.object({

        token: z
            .string()
            .trim()
            .min(
                1,
                "Password reset token is required."
            )
            .max(
                200,
                "Password reset token is invalid."
            ),

        newPassword: passwordSchema

    });


/*==================================================
    Email Verification
==================================================*/

export const verifyEmailSchema =
    z.object({

        token: z
            .string()
            .trim()
            .min(
                1,
                "Verification token is required."
            )
            .max(
                200,
                "Verification token is invalid."
            )

    });


/*==================================================
    Export Shared Schemas
==================================================*/

export {
    emailSchema,
    passwordSchema
};


