
"use strict";

import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import ProductCatalogue from "../../src/models/ProductCatalogue.js";

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(
        mongoServer.getUri("streamflix_catalogue_test")
    );

    await ProductCatalogue.syncIndexes();
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await ProductCatalogue.deleteMany({});
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test("persists and retrieves a rental product", async () => {
    const created = await ProductCatalogue.create({
        productCode: "persistence-rental-9801",
        productType: "rental",
        displayName: "Persistence Test Rental",
        movieId: 9801,
        rentalDurationHours: 48,
        priceMinor: 100000,
        currency: "NGN",
        status: "active"
    });

    const found = await ProductCatalogue.findById(created._id).lean();

    assert.ok(found);
    assert.equal(found.productCode, "persistence-rental-9801");
    assert.equal(found.productType, "rental");
    assert.equal(found.movieId, 9801);
    assert.equal(found.rentalDurationHours, 48);
    assert.equal(found.priceMinor, 100000);
    assert.equal(found.currency, "NGN");
    assert.equal(found.status, "active");
});

test("enforces unique product codes in MongoDB", async () => {
    const product = {
        productCode: "unique-catalogue-code",
        productType: "subscription",
        displayName: "Unique Code Test",
        billingInterval: "monthly",
        priceMinor: 250000
    };

    await ProductCatalogue.create(product);

    await assert.rejects(
        ProductCatalogue.create({
            ...product,
            displayName: "Duplicate Code Test"
        }),
        error => error.code === 11000
    );

    assert.equal(
        await ProductCatalogue.countDocuments({
            productCode: "unique-catalogue-code"
        }),
        1
    );
});
