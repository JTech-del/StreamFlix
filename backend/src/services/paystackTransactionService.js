"use strict";

import { getPaystackSecretKey } from "../config/paystackConfig.js";

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

export async function initializePaystackTransaction({
    email,
    amountMinor,
    currency = "NGN",
    reference,
    fetchImpl = globalThis.fetch,
    secretKey,
    timeoutMs = 10000
}) {
    if (typeof email !== "string" || !email.trim()) {
        throw makeError("A customer email is required.", "INVALID_PAYMENT_EMAIL");
    }

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw makeError("The payment amount must be a positive safe integer.", "INVALID_PAYMENT_AMOUNT");
    }

    if (currency !== "NGN") {
        throw makeError("Unsupported payment currency.", "INVALID_PAYMENT_CURRENCY");
    }

    if (
        typeof reference !== "string" ||
        !/^[A-Za-z0-9.= -]+$/.test(reference) ||
        reference.includes(" ") ||
        reference.length > 100
    ) {
        throw makeError("A valid Paystack transaction reference is required.", "INVALID_PAYMENT_REFERENCE");
    }

    if (typeof fetchImpl !== "function") {
        throw makeError("A valid HTTP client is required.", "INVALID_PAYMENT_HTTP_CLIENT");
    }

    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
        throw makeError("The provider timeout must be between 1 and 60000 milliseconds.", "INVALID_PAYMENT_TIMEOUT");
    }

    const apiSecret = secretKey ?? getPaystackSecretKey();

    let response;

    try {
        response = await fetchImpl(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiSecret}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim(),
                    amount: String(amountMinor),
                    currency,
                    reference
                }),
                signal: AbortSignal.timeout(timeoutMs)
            }
        );
    } catch (cause) {
        const error = makeError(
            "Paystack initialization outcome is uncertain; reconcile before retrying.",
            "PAYSTACK_INITIALIZATION_UNCERTAIN"
        );
        error.cause = cause;
        throw error;
    }

    let payload;

    try {
        payload = await response.json();
    } catch (cause) {
        const error = makeError(
            "Paystack returned an unreadable response; reconcile before retrying.",
            "PAYSTACK_INITIALIZATION_UNCERTAIN"
        );
        error.cause = cause;
        throw error;
    }

    if (
        !response.ok ||
        payload?.status !== true ||
        typeof payload?.data?.authorization_url !== "string" ||
        typeof payload?.data?.access_code !== "string" ||
        payload?.data?.reference !== reference
    ) {
        throw makeError(
            "Paystack did not confirm initialization with the expected reference; reconcile before retrying.",
            "PAYSTACK_INITIALIZATION_UNCERTAIN"
        );
    }

    let checkoutUrl;

    try {
        checkoutUrl = new URL(payload.data.authorization_url);
    } catch {
        throw makeError(
            "Paystack returned an invalid checkout URL; reconcile before retrying.",
            "PAYSTACK_INITIALIZATION_UNCERTAIN"
        );
    }

    if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.paystack.com"
    ) {
        throw makeError(
            "Paystack returned an unexpected checkout URL; reconcile before retrying.",
            "PAYSTACK_INITIALIZATION_UNCERTAIN"
        );
    }

    return {
        authorizationUrl: checkoutUrl.toString(),
        accessCode: payload.data.access_code,
        reference: payload.data.reference
    };
}