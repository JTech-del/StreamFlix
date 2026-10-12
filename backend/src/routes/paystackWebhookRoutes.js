"use strict";

import express from "express";

import {
    requireValidPaystackSignature
} from "../middleware/paystackWebhookMiddleware.js";

import {
    ingestPaystackWebhook
} from "../services/paystackWebhookIngestionService.js";

const router = express.Router();

router.post(
    "/",
    express.raw({
        type: "application/json",
        limit: "1mb"
    }),
    requireValidPaystackSignature,
    async (req, res, next) => {
        try {
            const result = await ingestPaystackWebhook(req.body);

            return res.status(200).json({
                success: true,
                received: true,
                duplicate: result.outcome === "duplicate"
            });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;
