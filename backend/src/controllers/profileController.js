"use strict";

import {
    updateProfileSchema
} from "../validation/profileSchemas.js";

import {
    getOrCreateProfile,
    updateProfile
} from "../services/profileService.js";

/*==================================================
    Get Profile
==================================================*/

export async function getProfile(
    req,
    res
) {

    try {

        const profile =
            await getOrCreateProfile(
                req.user.id
            );

        return res.status(200).json({

            success: true,

            data: {
                profile
            }

        });

    } catch (error) {

        console.error(
            "Get profile failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load profile."

        });

    }

}


/*==================================================
    Update Profile
==================================================*/

export async function patchProfile(
    req,
    res
) {

    /*----------------------------------------------
        Validate Request
    ----------------------------------------------*/

    const validation =
        updateProfileSchema.safeParse(
            req.body
        );

    if (!validation.success) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid profile data.",

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


    try {

        const profile =
            await updateProfile(
                req.user.id,
                validation.data
            );

        return res.status(200).json({

            success: true,

            message:
                "Profile updated successfully.",

            data: {
                profile
            }

        });

    } catch (error) {

        console.error(
            "Update profile failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update profile."

        });

    }

}
