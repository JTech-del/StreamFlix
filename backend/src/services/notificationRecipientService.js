"use strict";

import User from "../models/User.js";

/*==================================================
    Notification Recipient Resolution
==================================================*/

/*
    Current movie.published audience contract:

    - Active accounts receive the notification.
    - Suspended accounts do not.
    - Disabled accounts do not.

    Recipient resolution is intentionally separate from
    notification job creation so future notification
    types can introduce different audience rules without
    changing generic Job infrastructure.
*/

/**
 * Streams eligible active users without loading the
 * entire audience into memory.
 *
 * @returns {AsyncGenerator<string>}
 */
export async function* streamActiveRecipientUserIds() {
    const cursor = User
        .find({
            status: "active"
        })
        .select({
            _id: 1
        })
        .lean()
        .cursor();

    for await (const user of cursor) {
        yield user._id.toString();
    }
}
