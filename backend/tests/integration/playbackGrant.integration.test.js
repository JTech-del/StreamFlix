"use strict";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { before, after, afterEach, beforeEach } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

import { app } from "../../src/server.js";
import Movie from "../../src/models/Movie.js";
import User from "../../src/models/User.js";
import Session from "../../src/models/Session.js";
import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";
import { createAccessToken } from "../../src/services/authService.js";
import config from "../../src/config/config.js";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let mongo;
let user;
let sessionId;
let accessToken;
const movieId = 98761;
let mediaFilename;
let mediaSize;
let mediaPath;
let trailerPath;
const videosDirectory = fileURLToPath(new URL("../../storage/videos/", import.meta.url));
const trailersDirectory = fileURLToPath(new URL("../../storage/trailers/", import.meta.url));

before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("streamflix_playback_grant_test"));
});

beforeEach(async () => {
    await Promise.all([
        Movie.deleteMany({}),
        User.deleteMany({}),
        Session.deleteMany({}),
        PurchaseEntitlement.deleteMany({})
    ]);

    mediaFilename = `playback-test-${randomUUID()}.mp4`;
    mediaPath = path.join(videosDirectory, mediaFilename);
    trailerPath = null;
    const fixtureBytes = Buffer.from(Array.from({ length: 64 }, (_, index) => index));
    fs.writeFileSync(mediaPath, fixtureBytes, { flag: "wx" });
    mediaSize = fixtureBytes.length;

    user = await User.create({
        email: `playback-${randomUUID()}@example.test`,
        passwordHash: "test-hash-long-enough",
        role: "user",
        status: "active",
        emailVerified: true
    });
    sessionId = randomUUID();
    await Session.create({
        userId: user._id,
        refreshTokenHash: randomUUID(),
        sessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    accessToken = createAccessToken(user, sessionId);
    await Movie.create({
        id: movieId,
        slug: `playback-${randomUUID()}`,
        title: "Playback Fixture",
        description: "Authorized test fixture.",
        year: 2024,
        duration: "1h",
        rating: "PG",
        media: { video: mediaFilename, playbackApproved: true },
        status: "published"
    });

});

afterEach(() => {
    if (mediaPath) fs.rmSync(mediaPath, { force: true });
    if (trailerPath) fs.rmSync(trailerPath, { force: true });
});

async function addRentalEntitlement(forUser = user, forMovie = movieId) {
    const now = new Date();
    await PurchaseEntitlement.create({
        paymentAttemptRef: new mongoose.Types.ObjectId(),
        attemptId: `test-${randomUUID()}`,
        provider: "paystack",
        providerTransactionId: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
        providerReference: `ref-${randomUUID()}`,
        userId: forUser._id,
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "rental",
        movieId: forMovie,
        rentalDurationHours: 48,
        amountMinor: 100000,
        currency: "NGN",
        status: "active",
        grantedAt: now,
        startsAt: new Date(now.getTime() - 1000),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        revokedAt: null
    });
}

async function addSubscriptionEntitlement(forUser = user) {
    const now = new Date();
    await PurchaseEntitlement.create({
        paymentAttemptRef: new mongoose.Types.ObjectId(),
        attemptId: `subscription-${randomUUID()}`,
        provider: "paystack",
        providerTransactionId: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
        providerReference: `subscription-ref-${randomUUID()}`,
        userId: forUser._id,
        productId: new mongoose.Types.ObjectId(),
        purchaseType: "subscription",
        movieId: null,
        rentalDurationHours: null,
        billingInterval: "monthly",
        amountMinor: 100000,
        currency: "NGN",
        status: "active",
        grantedAt: now,
        startsAt: new Date(now.getTime() - 1000),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        revokedAt: null
    });
}

async function issueGrant() {
    return request(app)
        .post(`/api/videos/${movieId}/authorization`)
        .set("Authorization", `Bearer ${accessToken}`);
}

after(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});

test("authenticated entitled user obtains a movie-scoped, non-cacheable grant", async () => {
    await addRentalEntitlement();
    const response = await issueGrant();
    assert.equal(response.status, 200);
    assert.equal(response.body.data.expiresIn > 0, true);
    assert.equal(response.headers["cache-control"], "no-store, private");
    assert.equal(response.body.data.grant.includes(mediaFilename), false);
});

test("duplicate media mappings are not advertised or granted for playback", async () => {
    await addRentalEntitlement();
    await Movie.create({
        id: movieId + 1,
        slug: `duplicate-${randomUUID()}`,
        title: "Ambiguous duplicate fixture",
        description: "Duplicate media reference.",
        year: 2024,
        duration: "1h",
        rating: "PG",
        media: { video: mediaFilename },
        status: "published"
    });

    const catalogue = await request(app).get(`/api/movies/${movieId}`);
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.body.data.video, null);
    assert.equal(catalogue.body.data.playbackAvailable, false);
    assert.equal((await issueGrant()).status, 404);
});

test("unapproved full-video references are not advertised or granted", async () => {
    await addRentalEntitlement();
    await Movie.updateOne({ id: movieId }, { $set: { "media.playbackApproved": false } });
    const catalogue = await request(app).get(`/api/movies/${movieId}`);
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.body.data.video, null);
    assert.equal(catalogue.body.data.playbackAvailable, false);
    assert.equal((await issueGrant()).status, 404);
});

test("grant issuance denies unauthenticated and unentitled users", async () => {
    await addRentalEntitlement();
    assert.equal((await request(app).post(`/api/videos/${movieId}/authorization`)).status, 401);
    assert.equal((await request(app).get(`/api/videos/${movieId}`)).status, 401);

    const secondUser = await User.create({
        email: `unentitled-${randomUUID()}@example.test`,
        passwordHash: "test-hash-long-enough",
        role: "user",
        status: "active"
    });
    const secondSessionId = randomUUID();
    await Session.create({
        userId: secondUser._id,
        refreshTokenHash: randomUUID(),
        sessionId: secondSessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    const token = createAccessToken(secondUser, secondSessionId);
    assert.equal((await request(app)
        .post(`/api/videos/${movieId}/authorization`)
        .set("Authorization", `Bearer ${token}`)).status, 403);
});

test("valid grant authorizes byte ranges and rechecks entitlement on every range request", async () => {
    await addRentalEntitlement();
    const grantResponse = await issueGrant();
    const url = `/api/videos/${movieId}?grant=${encodeURIComponent(grantResponse.body.data.grant)}`;

    const range = await request(app).get(url).set("Range", "bytes=0-15");
    assert.equal(range.status, 206);
    assert.equal(range.headers["accept-ranges"], "bytes");
    assert.equal(range.headers["content-range"], `bytes 0-15/${mediaSize}`);
    assert.equal(range.headers["content-length"], "16");
    assert.equal(range.body.length, 16);

    const full = await request(app).get(url);
    assert.equal(full.status, 200);
    assert.equal(full.headers["content-type"], "video/mp4");
    assert.equal(full.headers["content-length"], String(mediaSize));
    assert.equal(full.body.length, mediaSize);

    const head = await request(app).head(url);
    assert.equal(head.status, 200);
    assert.equal(head.headers["accept-ranges"], "bytes");
    assert.equal(head.headers["content-length"], String(mediaSize));

    const suffixRange = await request(app).get(url).set("Range", "bytes=-16");
    assert.equal(suffixRange.status, 206);
    assert.equal(suffixRange.headers["content-length"], "16");

    const unsatisfiable = await request(app).get(url).set("Range", "bytes=999999999-");
    assert.equal(unsatisfiable.status, 416);
    assert.match(unsatisfiable.headers["content-range"], /^bytes \*\//);

    assert.equal((await request(app).get(url).set("Range", "bytes=0-1,4-5")).status, 416);

    await PurchaseEntitlement.updateOne({ userId: user._id }, { $set: { status: "revoked", revokedAt: new Date() } });
    assert.equal((await request(app).get(url).set("Range", "bytes=16-31")).status, 403);
});

test("public trailer route rejects a byte-identical full movie even when it is unapproved", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-copy-${randomUUID()}.mp4`);
    fs.copyFileSync(mediaPath, trailerPath);
    await Movie.updateOne({ id: movieId }, {
        $set: {
            "media.trailer": path.basename(trailerPath),
            "media.playbackApproved": false
        }
    });

    const response = await request(app).get(`/api/videos/trailers/${movieId}`);
    assert.equal(response.status, 404);
    assert.equal(response.text.includes("trailer-copy"), false);
});

test("public trailer route retains byte-range delivery for a distinct preview", async () => {
    const trailerBytes = Buffer.from("distinct preview fixture");
    trailerPath = path.join(trailersDirectory, `trailer-preview-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, trailerBytes, { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const response = await request(app)
        .get(`/api/videos/trailers/${movieId}`)
        .set("Range", "bytes=0-7");
    assert.equal(response.status, 206);
    assert.equal(response.headers["content-range"], `bytes 0-7/${trailerBytes.length}`);
    assert.equal(response.headers["content-length"], "8");
    assert.equal(response.body.toString(), "distinct");
});

test("grant rejects another movie, malformed tokens, and expired tokens", async () => {
    await addRentalEntitlement();
    const issued = await issueGrant();
    const token = issued.body.data.grant;
    assert.equal((await request(app).get(`/api/videos/${movieId + 1}?grant=${encodeURIComponent(token)}`)).status, 401);
    const malformedResponse = await request(app).get(`/api/videos/${movieId}?grant=not-a-token`);
    assert.equal(malformedResponse.status, 401);
    assert.equal(malformedResponse.text.includes("not-a-token"), false);

    const expired = jwt.sign(
        { sub: user._id.toString(), sid: sessionId, type: "playback", purpose: "movie", movieId },
        config.jwt.accessSecret,
        {
            algorithm: config.jwt.algorithm,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
            expiresIn: -1
        }
    );
    assert.equal((await request(app).get(`/api/videos/${movieId}?grant=${encodeURIComponent(expired)}`)).status, 401);
});

test("revoked sessions, missing assets, and unsatisfiable ranges fail closed", async () => {
    await addRentalEntitlement();
    const grant = (await issueGrant()).body.data.grant;
    const url = `/api/videos/${movieId}?grant=${encodeURIComponent(grant)}`;

    await Session.updateOne({ sessionId }, { $set: { revokedAt: new Date() } });
    assert.equal((await request(app).get(url)).status, 401);

    await Session.updateOne({ sessionId }, { $set: { revokedAt: null } });
    await Movie.updateOne({ id: movieId }, { $set: { "media.video": "missing-playback-file.mp4" } });
    assert.equal((await issueGrant()).status, 404);
});

test("an issued grant stops working after the session absolute expiry", async () => {
    await addRentalEntitlement();
    const grant = (await issueGrant()).body.data.grant;
    const url = `/api/videos/${movieId}?grant=${encodeURIComponent(grant)}`;

    await Session.updateOne({ sessionId }, { $set: { absoluteExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await request(app).get(url).set("Range", "bytes=0-0")).status, 401);
});

test("entitlement expiry and cancellation block already-issued grants", async () => {
    await addRentalEntitlement();
    const grant = (await issueGrant()).body.data.grant;
    const url = `/api/videos/${movieId}?grant=${encodeURIComponent(grant)}`;

    await PurchaseEntitlement.updateOne(
        { userId: user._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    assert.equal((await request(app).get(url).set("Range", "bytes=0-0")).status, 403);

    await PurchaseEntitlement.updateOne(
        { userId: user._id },
        { $set: { expiresAt: new Date(Date.now() + 60 * 60 * 1000), status: "revoked", revokedAt: new Date() } }
    );
    assert.equal((await request(app).get(url).set("Range", "bytes=0-0")).status, 403);
});

test("subscription cancellation invalidates an already-issued grant", async () => {
    await addSubscriptionEntitlement();
    const grant = (await issueGrant()).body.data.grant;
    const url = `/api/videos/${movieId}?grant=${encodeURIComponent(grant)}`;
    await PurchaseEntitlement.updateOne(
        { userId: user._id },
        { $set: { status: "revoked", revokedAt: new Date() } }
    );
    assert.equal((await request(app).get(url).set("Range", "bytes=0-0")).status, 403);
});
