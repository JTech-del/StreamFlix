"use strict";

import { getPaystackSecretKey } from "../config/paystackConfig.js";
import {
    isValidPaystackSignature
} from "../services/paystackSignatureService.js";

export function requireValidPaystackSignature(req, res, next) {
    if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({
            success: false,
            message: "Invalid webhook request body."
        });
    }

    const signature = req.get("x-paystack-signature");

    if (typeof signature !== "string" || signature.length === 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid webhook signature."
        });
    }

    let secret;

    try {
        secret = getPaystackSecretKey();
    } catch {
        return res.status(503).json({
            success: false,
            message: "Webhook verification is unavailable."
        });
    }

    if (!isValidPaystackSignature(req.body, signature, secret)) {
        return res.status(401).json({
            success: false,
            message: "Invalid webhook signature."
        });
    }

    return next();
}
