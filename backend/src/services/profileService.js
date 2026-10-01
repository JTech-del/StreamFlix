"use strict";

import Profile from "../models/Profile.js";

const PROFILE_FIELDS = [
    "displayName",
    "firstName",
    "lastName",
    "bio",
    "avatarUrl"
];

function buildProfileUpdate(data) {
    return Object.fromEntries(
        PROFILE_FIELDS
            .filter((field) => Object.prototype.hasOwnProperty.call(data, field))
            .map((field) => [field, data[field]])
    );
}

export async function getOrCreateProfile(userId) {
    return Profile.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true
        }
    ).lean();
}

export async function updateProfile(userId, data) {
    const updates = buildProfileUpdate(data);

    return Profile.findOneAndUpdate(
        { userId },
        { $set: updates },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true
        }
    ).lean();
}
