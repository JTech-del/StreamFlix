"use strict";

import { getPaystackSecretKey } from "../config/paystackConfig.js";

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

export async function verifyPaystackTransaction({
    reference,
    amountMinor,
    currency = "NGN",
    fetchImpl = globalThis.fetch,
    secretKey,
    timeoutMs = 10000
}) {
    if (
        typeof reference !== "string" ||
        reference.trim() === "" ||
        reference !== reference.trim() ||
        reference.length > 100
    ) {
        throw makeError(
            "A valid payment reference is required.",
            "INVALID_PAYMENT_REFERENCE"
        );
    }

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw makeError(
            "The expected amount must be a positive safe integer.",
            "INVALID_PAYMENT_AMOUNT"
        );
    }

    if (currency !== "NGN") {
        throw makeError(
            "Unsupported payment currency.",
            "INVALID_PAYMENT_CURRENCY"
        );
    }

    if (typeof fetchImpl !== "function") {
        throw makeError(
            "A valid HTTP client is required.",
            "INVALID_PAYMENT_HTTP_CLIENT"
        );
    }

    if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60000
    ) {
        throw makeError(
            "The provider timeout must be between 1 and 60000 milliseconds.",
            "INVALID_PAYMENT_TIMEOUT"
        );
    }

    const apiSecret = secretKey ?? getPaystackSecretKey();

    let response;
    let payload;

    try {
        response = await fetchImpl(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apiSecret}`,
                    Accept: "application/json"
                },
                signal: AbortSignal.timeout(timeoutMs)
            }
        );

        payload = await response.json();
    } catch (cause) {
        const error = makeError(
            "Paystack verification could not be confirmed.",
            "PAYSTACK_VERIFICATION_UNCERTAIN"
        );
        error.cause = cause;
        throw error;
    }

    if (
        !response.ok ||
        payload?.status !== true ||
        !payload.data ||
        typeof payload.data !== "object"
    ) {
        throw makeError(
            "Paystack returned an unconfirmed verification response.",
            "PAYSTACK_VERIFICATION_UNCERTAIN"
        );
    }

    const transaction = payload.data;

    if (transaction.reference !== reference) {
        throw makeError(
            "The verified transaction reference does not match.",
            "PAYSTACK_VERIFICATION_MISMATCH"
        );
    }

    if (
        !Number.isSafeInteger(transaction.amount) ||
        transaction.amount !== amountMinor
    ) {
        throw makeError(
            "The verified transaction amount does not match.",
            "PAYSTACK_VERIFICATION_MISMATCH"
        );
    }

    if (transaction.currency !== currency) {
        throw makeError(
            "The verified transaction currency does not match.",
            "PAYSTACK_VERIFICATION_MISMATCH"
        );
    }

    if (
        typeof transaction.id !== "number" ||
        !Number.isSafeInteger(transaction.id) ||
        transaction.id <= 0
    ) {
        throw makeError(
            "The provider transaction ID is invalid.",
            "PAYSTACK_VERIFICATION_UNCERTAIN"
        );
    }

    if (transaction.status !== "success") {
        throw makeError(
            "Paystack has not confirmed a successful transaction.",
            "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL"
        );
    }

    return {
        verified: true,
        reference: transaction.reference,
        transactionId: transaction.id,
        amountMinor: transaction.amount,
        currency: transaction.currency,
        status: transaction.status
    };
}
