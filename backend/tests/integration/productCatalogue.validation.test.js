
"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import ProductCatalogue from "../../src/models/ProductCatalogue.js";

function rental(overrides = {}) {
    return new ProductCatalogue({
        productCode: "movie-rental-9801",
        productType: "rental",
        displayName: "Test Movie Rental",
        movieId: 9801,
        rentalDurationHours: 48,
        priceMinor: 100000,
        ...overrides
    });
}

function subscription(overrides = {}) {
    return new ProductCatalogue({
        productCode: "premium-monthly",
        productType: "subscription",
        displayName: "Premium Monthly",
        billingInterval: "monthly",
        priceMinor: 250000,
        ...overrides
    });
}

test("valid rental passes validation", async () => {
    const product = rental();
    await product.validate();

    assert.equal(product.productType, "rental");
    assert.equal(product.movieId, 9801);
    assert.equal(product.rentalDurationHours, 48);
    assert.equal(product.billingInterval, null);
    assert.equal(product.currency, "NGN");
});

test("valid subscription passes validation", async () => {
    const product = subscription();
    await product.validate();

    assert.equal(product.productType, "subscription");
    assert.equal(product.movieId, null);
    assert.equal(product.rentalDurationHours, null);
    assert.equal(product.billingInterval, "monthly");
});

test("rental without movie ID is rejected", async () => {
    await assert.rejects(
        rental({ movieId: null }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.movieId)
    );
});

test("subscription without billing interval is rejected", async () => {
    await assert.rejects(
        subscription({ billingInterval: null }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.billingInterval)
    );
});

test("rental with billing interval is rejected", async () => {
    await assert.rejects(
        rental({ billingInterval: "monthly" }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.billingInterval)
    );
});

test("subscription with movie ID is rejected", async () => {
    await assert.rejects(
        subscription({ movieId: 9801 }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.movieId)
    );
});

test("rental without a valid duration is rejected", async () => {
    for (const rentalDurationHours of [
        null,
        0,
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1
    ]) {
        await assert.rejects(
            rental({ rentalDurationHours }).validate(),
            error =>
                error.name === "ValidationError" &&
                Boolean(error.errors.rentalDurationHours)
        );
    }
});

test("subscription with a rental duration is rejected", async () => {
    await assert.rejects(
        subscription({ rentalDurationHours: 48 }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.rentalDurationHours)
    );
});

test("fractional price is rejected", async () => {
    await assert.rejects(
        rental({ priceMinor: 100.5 }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.priceMinor)
    );
});

test("zero and negative prices are rejected", async () => {
    for (const priceMinor of [0, -1]) {
        await assert.rejects(
            rental({ priceMinor }).validate(),
            error =>
                error.name === "ValidationError" &&
                Boolean(error.errors.priceMinor)
        );
    }
});

test("malformed product code is rejected", async () => {
    await assert.rejects(
        rental({ productCode: "invalid_product_code" }).validate(),
        error =>
            error.name === "ValidationError" &&
            Boolean(error.errors.productCode)
    );
});
