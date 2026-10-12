"use strict";

export function getPaystackSecretKey(env = process.env) {
    const secretKey = env.PAYSTACK_SECRET_KEY;

    if (typeof secretKey !== "string" || secretKey.trim() === "") {
        const error = new Error(
            "Paystack secret key is not configured."
        );
        error.code = "PAYSTACK_SECRET_KEY_MISSING";
        throw error;
    }

    return secretKey.trim();
}
