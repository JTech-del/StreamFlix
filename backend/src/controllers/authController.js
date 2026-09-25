"use strict";

/*==================================================
    StreamFlix

    Authentication Controller

    Responsibility:

    ✓ Handle registration HTTP requests
    ✓ Handle login HTTP requests
    ✓ Validate request input
    ✓ Create user accounts
    ✓ Verify passwords
    ✓ Create access and refresh tokens
    ✓ Create persistent sessions
    ✓ Return safe user information

    Does NOT handle:

    ✗ JWT implementation
    ✗ Password hashing implementation
    ✗ Database connection management
    ✗ Frontend state
==================================================*/

import mongoose from "mongoose";
import User from "../models/User.js";
import Session from "../models/Session.js";

import config from "../config/config.js";

import {
hashPassword,
verifyPassword,
createAccessToken,
createRefreshToken,
verifyRefreshToken,
generateSessionId,
hashRefreshToken,
durationToMilliseconds
} from "../services/authService.js";

import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    logoutSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} from "../validation/authSchemas.js";
import {
    sendPasswordResetEmail
} from "../services/email/passwordResetEmailService.js";

/*==================================================
    Register User
==================================================*/

export async function register(
    req,
    res
) {

    const validation =
        registerSchema.safeParse(
            req.body
        );


    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message: "Invalid registration data.",

            errors: validation.error.issues.map(
                issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                })
            )

        });

    }


    const {
        email,
        password
    } = validation.data;


    try {

        const existingUser =
            await User
                .findOne({
                    email
                })
                .select("_id");


        if (existingUser) {

            return res.status(409).json({

                success: false,

                message: "An account with this email already exists."

            });

        }


        const passwordHash =
            await hashPassword(
                password
            );


        const user =
            await User.create({

                email,

                passwordHash

            });


        const verification =
            await createVerificationToken(
                user._id,
                "email_verification"
            );


        await sendVerificationEmail({

            email: user.email,

            token: verification.token

        });


        return res.status(201).json({

            success: true,

            message: "Account created successfully.",

            data: {

                id: user._id,

                email: user.email,

                role: user.role,

                status: user.status,

                emailVerified: user.emailVerified,

                createdAt: user.createdAt

            }

        });

    } catch (error) {

        if (error?.code === 11000) {

            return res.status(409).json({

                success: false,

                message: "An account with this email already exists."

            });

        }


        console.error(
            "User registration failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to create account."

        });

    }

}


/*==================================================
    Verify Email
==================================================*/

export async function verifyEmail(
    req,
    res
) {

    const validation =
        verifyEmailSchema.safeParse(
            req.query
        );


    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid email verification request."

        });

    }


    const {
        token
    } = validation.data;


    try {

        /*------------------------------------------
            Atomically Consume Verification Token
        ------------------------------------------*/

        const verificationToken =
            await consumeVerificationToken(
                token,
                "email_verification"
            );


        if (!verificationToken) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid or expired verification token."

            });

        }


        /*------------------------------------------
            Find User
        ------------------------------------------*/

        const user =
            await User.findById(
                verificationToken.userId
            );


        if (!user) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid or expired verification token."

            });

        }


        /*------------------------------------------
            Mark Email As Verified
        ------------------------------------------*/

        if (!user.emailVerified) {

            user.emailVerified =
                true;

            await user.save();

        }


        /*------------------------------------------
            Response
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message:
                "Email verified successfully.",

            data: {

                id: user._id,

                email: user.email,

                emailVerified:
                    user.emailVerified

            }

        });

    } catch (error) {

        console.error(
            "Email verification failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to verify email."

        });

    }

}

/*==================================================
    Forgot Password
==================================================*/

export async function forgotPassword(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        forgotPasswordSchema.safeParse(
            req.body
        );

    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "A valid email address is required."

        });

    }

    const { email } =
        validation.data;

    try {

        const user =
            await User.findOne({
                email
            });

        /*
            Always return the same response
            whether the account exists or not.

            This prevents account enumeration.
        */

        if (!user) {

            return res.status(200).json({

                success: true,

                message:
                    "If an account with that email exists, a password reset link has been sent."

            });

        }


        /*------------------------------------------
            Create Password Reset Token
        ------------------------------------------*/

        const verification =
            await createVerificationToken(
                user._id,
                "password_reset"
            );


        /*------------------------------------------
            Send Password Reset Email
        ------------------------------------------*/

        try {

            await sendPasswordResetEmail({

                email: user.email,

                token:
                    verification.token

            });

        } catch (emailError) {

            console.error(
                "Password reset email delivery failed:",
                emailError
            );

        }


        /*------------------------------------------
            Generic Response
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message:
                "If an account with that email exists, a password reset link has been sent."

        });

    } catch (error) {

        console.error(
            "Forgot password failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to process password reset request."

        });

    }

}


/*==================================================
    Login User
==================================================*/

export async function login(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        loginSchema.safeParse(
            req.body
        );


    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message: "Invalid login data.",

            errors: validation.error.issues.map(
                issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                })
            )

        });

    }


    const {
        email,
        password
    } = validation.data;


    try {

        /*------------------------------------------
            Find User
        ------------------------------------------*/

        const user =
            await User
                .findOne({
                    email
                })
                .select("+passwordHash");


        /*------------------------------------------
            Generic Authentication Failure
        ------------------------------------------*/

        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        /*------------------------------------------
            Verify Password
        ------------------------------------------*/

        const passwordValid =
            await verifyPassword(
                password,
                user.passwordHash
            );


        if (!passwordValid) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        /*------------------------------------------
            Account Status
        ------------------------------------------*/

        if (
            user.status === "suspended" ||
            user.status === "disabled"
        ) {

            return res.status(403).json({

                success: false,

                message: "This account is not available."

            });

        }


        /*------------------------------------------
            Email Verification
        ------------------------------------------*/

        if (!user.emailVerified) {

            return res.status(403).json({

                success: false,

                message:
                    "Please verify your email address before logging in."

            });

        }


        /*------------------------------------------
            Create Session Identity
        ------------------------------------------*/

        const sessionId =
            generateSessionId();


        /*------------------------------------------
            Create Refresh Token
        ------------------------------------------*/

        const refreshToken =
            createRefreshToken(
                user,
                sessionId
            );


        /*------------------------------------------
            Hash Refresh Token
        ------------------------------------------*/

        const refreshTokenHash =
            hashRefreshToken(
                refreshToken
            );


        /*------------------------------------------
            Calculate Session Expiry
        ------------------------------------------*/

        const expiresAt =
            new Date(
                Date.now() +
                durationToMilliseconds(
                    config.jwt.refreshExpiresIn
                )
            );


        /*------------------------------------------
            Persist Session
        ------------------------------------------*/
const session =
        await Session.create({

            userId: user._id,

            refreshTokenHash,

            sessionId,

            device:
                req.headers["sec-ch-ua"] ||
                null,

            ipAddress:
                req.ip ||
                null,

            userAgent:
                req.headers["user-agent"] ||
                null,

            expiresAt,

            lastUsedAt: new Date()

        });


        /*------------------------------------------
            Create Access Token
        ------------------------------------------*/
const accessToken =
    createAccessToken(
        user,
        session.sessionId
    );
        /*------------------------------------------
            Update Login Timestamp
        ------------------------------------------*/

        user.lastLoginAt =
            new Date();

        await user.save();


        /*------------------------------------------
            Safe User Response
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message: "Login successful.",

            data: {

                accessToken,

                refreshToken,

                sessionId,

                user: {

                    id: user._id,

                    email: user.email,

                    role: user.role,

                    status: user.status,

                    emailVerified:
                        user.emailVerified,

                    lastLoginAt:
                        user.lastLoginAt

                }

            }

        });

    } catch (error) {

        console.error(
            "User login failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to login."

        });

    }

}

/*==================================================
    Reset Password
==================================================*/

export async function resetPassword(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        resetPasswordSchema.safeParse(
            req.body
        );

    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid password reset request."

        });

    }

    const {
        token,
        newPassword
    } = validation.data;

    const session =
        await mongoose.startSession();

    try {

        await session.withTransaction(
            async () => {

                /*------------------------------------------
                    Consume Password Reset Token
                ------------------------------------------*/

                const verificationToken =
                    await consumeVerificationToken(
                        token,
                        "password_reset",
                        session
                    );

                if (!verificationToken) {

                    const error =
                        new Error(
                            "INVALID_OR_EXPIRED_RESET_TOKEN"
                        );

                    error.code =
                        "INVALID_OR_EXPIRED_RESET_TOKEN";

                    throw error;

                }


                /*------------------------------------------
                    Find User
                ------------------------------------------*/

                const user =
                    await User.findById(
                        verificationToken.userId
                    ).session(session);

                if (!user) {

                    const error =
                        new Error(
                            "INVALID_OR_EXPIRED_RESET_TOKEN"
                        );

                    error.code =
                        "INVALID_OR_EXPIRED_RESET_TOKEN";

                    throw error;

                }


                /*------------------------------------------
                    Hash New Password
                ------------------------------------------*/

                const passwordHash =
                    await hashPassword(
                        newPassword
                    );


                /*------------------------------------------
                    Update Password
                ------------------------------------------*/

                user.passwordHash =
                    passwordHash;

                await user.save({
                    session
                });


                /*------------------------------------------
                    Revoke Active Sessions
                ------------------------------------------*/

                await Session.updateMany(
                    {
                        userId: user._id,
                        revokedAt: null,
                        expiresAt: {
                            $gt: new Date()
                        }
                    },
                    {
                        $set: {
                            revokedAt: new Date(),
                            revocationReason:
                                "password_reset"
                        }
                    },
                    {
                        session
                    }
                );

            }
        );


        /*------------------------------------------
            Response
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message:
                "Password reset successfully."

        });

    } catch (error) {

        if (
            error?.code ===
            "INVALID_OR_EXPIRED_RESET_TOKEN"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid or expired password reset token."

            });

        }

        console.error(
            "Password reset failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to reset password."

        });

    } finally {

        await session.endSession();

    }

}
export async function refreshToken(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        refreshTokenSchema.safeParse(
            req.body
        );


    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid refresh token request.",

            errors:
                validation.error.issues.map(
                    issue => ({
                        field:
                            issue.path.join("."),

                        message:
                            issue.message
                    })
                )

        });

    }


    const {
        refreshToken: token
    } = validation.data;


    try {

        /*------------------------------------------
            Verify Refresh JWT
        ------------------------------------------*/

        const payload =
            verifyRefreshToken(
                token
            );


        /*------------------------------------------
            Find Session
        ------------------------------------------*/

        const session =
            await Session
                .findOne({
                    sessionId:
                        payload.sid
                })
                .select(
                    "+refreshTokenHash"
                );


        if (!session) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired refresh token."

            });

        }


        /*------------------------------------------
            Session Revocation Check
        ------------------------------------------*/

        if (
            session.revokedAt ||
            session.expiresAt <= new Date()
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired refresh token."

            });

        }


        /*------------------------------------------
            Verify Session Ownership
        ------------------------------------------*/

        if (
            session.userId.toString() !==
            payload.sub
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /*------------------------------------------
            Verify Stored Token Hash
        ------------------------------------------*/

        const suppliedTokenHash =
            hashRefreshToken(
                token
            );


        if (
            suppliedTokenHash !==
            session.refreshTokenHash
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /*------------------------------------------
            Load User
        ------------------------------------------*/

        const user =
            await User.findById(
                session.userId
            );


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /*------------------------------------------
            Account Status
        ------------------------------------------*/

        if (
            user.status === "suspended" ||
            user.status === "disabled"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "This account is not available."

            });

        }


        /*------------------------------------------
            Rotate Refresh Token
        ------------------------------------------*/

        const newRefreshToken =
            createRefreshToken(
                user,
                session.sessionId
            );


        const newRefreshTokenHash =
            hashRefreshToken(
                newRefreshToken
            );


        const newExpiresAt =
            new Date(
                Date.now() +
                durationToMilliseconds(
                    config.jwt.refreshExpiresIn
                )
            );


        /*------------------------------------------
            Atomic Refresh Token Rotation
        ------------------------------------------*/

        const rotatedSession =
            await Session.findOneAndUpdate(
                {
                    sessionId:
                        session.sessionId,

                    refreshTokenHash:
                        suppliedTokenHash,

                    revokedAt: null,

                    expiresAt: {
                        $gt: new Date()
                    }
                },
                {
                    $set: {
                        refreshTokenHash:
                            newRefreshTokenHash,

                        expiresAt:
                            newExpiresAt,

                        lastUsedAt:
                            new Date(),

                        revokedAt:
                            null,

                        revocationReason:
                            null
                    }
                },
                {
                    returnDocument: "after"
                }
            );

        if (!rotatedSession) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /*------------------------------------------
            Create New Access Token
        ------------------------------------------*/

const accessToken =
    createAccessToken(
        user,
        session.sessionId
    );

        /*------------------------------------------
            Return Token Pair
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message:
                "Token refreshed successfully.",

            data: {

                accessToken,

                refreshToken:
                    newRefreshToken,

                sessionId:
                    session.sessionId

            }

        });

    } catch (error) {

        console.error(
            "Refresh token failed:",
            error
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired refresh token."

        });

    }

}


/*==================================================
    Logout User
==================================================*/

export async function logout(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        logoutSchema.safeParse(
            req.body
        );


    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid logout request.",

            errors:
                validation.error.issues.map(
                    issue => ({
                        field:
                            issue.path.join("."),

                        message:
                            issue.message
                    })
                )

        });

    }


    const {
        refreshToken: token
    } = validation.data;


    try {

        /*------------------------------------------
            Verify Refresh JWT
        ------------------------------------------*/

        const payload =
            verifyRefreshToken(
                token
            );


        /*------------------------------------------
            Find Session
        ------------------------------------------*/
const session =
    await Session
        .findOne({
            sessionId: payload.sid
        })
        .select(
            "+refreshTokenHash"
        );

        if (!session) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired refresh token."

            });

        }

const suppliedTokenHash =
    hashRefreshToken(token);

if (
    suppliedTokenHash !==
    session.refreshTokenHash
) {
    return res.status(401).json({
        success: false,
        message: "Invalid refresh token."
    });
}
        /*------------------------------------------
            Verify Session Ownership
        ------------------------------------------*/

        if (
            session.userId.toString() !==
            payload.sub
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /*------------------------------------------
            Revoke Session
        ------------------------------------------*/

        session.revokedAt =
            new Date();

        session.revocationReason =
            "logout";

        await session.save();


        /*------------------------------------------
            Logout Response
        ------------------------------------------*/

        return res.status(200).json({

            success: true,

            message:
                "Logged out successfully."

        });

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired refresh token."

        });

    }

}



import {
    createVerificationToken,
    consumeVerificationToken
} from "../services/verificationTokenService.js";

import {
    sendVerificationEmail
} from "../services/email/verificationEmailService.js";












