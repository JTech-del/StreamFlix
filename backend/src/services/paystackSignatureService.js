"use strict";

import { createHmac, timingSafeEqual } from "node:crypto";

export function isValidPaystackSignature(rawBody, signature, secret) {
    if (
        typeof rawBody !== "string" &&
        !Buffer.isBuffer(rawBody)
    ) {
        return false;
    }

    if (
        typeof signature !== "string" ||
        !/^[a-f0-9]{128}$/i.test(signature) ||
        typeof secret !== "string" ||
        secret.length === 0
    ) {
        return false;
    }

    const expected = createHmac("sha512", secret)
        .update(rawBody)
        .digest();

    const received = Buffer.from(signature, "hex");

    if (received.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(expected, received);
}
