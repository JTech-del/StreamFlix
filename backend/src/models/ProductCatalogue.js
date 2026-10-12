
"use strict";

import mongoose from "mongoose";

const productCatalogueSchema = new mongoose.Schema(
    {
        productCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 100,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
        },

        productType: {
            type: String,
            required: true,
            enum: ["rental", "subscription"],
            index: true
        },

        displayName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        movieId: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    if (this.productType !== "rental") {
                        return value === null || value === undefined;
                    }

                    return Number.isSafeInteger(value) && value > 0;
                },
                message:
                    "Rental products require a positive integer movieId; subscription products must not have one."
            }
        },

        rentalDurationHours: {
            type: Number,
            default: null,
            validate: {
                validator(value) {
                    if (this.productType !== "rental") {
                        return value === null || value === undefined;
                    }

                    return Number.isSafeInteger(value) && value > 0;
                },
                message:
                    "Rental products require a positive integer rentalDurationHours; subscription products must not have one."
            }
        },

        billingInterval: {
            type: String,
            enum: ["monthly", "annual", null],
            default: null,
            validate: {
                validator(value) {
                    if (this.productType === "subscription") {
                        return value === "monthly" || value === "annual";
                    }

                    return value === null || value === undefined;
                },
                message:
                    "Subscription products require a monthly or annual billing interval; rental products must not have one."
            }
        },

        priceMinor: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator(value) {
                    return Number.isSafeInteger(value);
                },
                message: "priceMinor must be a positive safe integer."
            }
        },

        currency: {
            type: String,
            required: true,
            enum: ["NGN"],
            default: "NGN"
        },

        status: {
            type: String,
            required: true,
            enum: ["active", "inactive"],
            default: "inactive",
            index: true
        }
    },
    {
        timestamps: true,
        collection: "product_catalogue",
        strict: "throw"
    }
);

productCatalogueSchema.index({
    productType: 1,
    status: 1
});

productCatalogueSchema.index({
    movieId: 1,
    productType: 1
});

const ProductCatalogue =
    mongoose.models.ProductCatalogue ||
    mongoose.model("ProductCatalogue", productCatalogueSchema);

export default ProductCatalogue;
