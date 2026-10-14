"use strict";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { before, after, afterEach, beforeEach } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import http from "node:http";
import { Readable } from "node:stream";

import { app } from "../../src/server.js";
import Movie from "../../src/models/Movie.js";
import User from "../../src/models/User.js";
import Session from "../../src/models/Session.js";
import PurchaseEntitlement from "../../src/models/PurchaseEntitlement.js";
import { createAccessToken } from "../../src/services/authService.js";
import config from "../../src/config/config.js";
import { getTrailerStream as getStoredTrailerStream } from "../../src/services/trailerService.js";
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

    const openEndedRange = await request(app).get(url).set("Range", "bytes=16-");
    assert.equal(openEndedRange.status, 206);
    assert.equal(openEndedRange.headers["content-range"], `bytes 16-${mediaSize - 1}/${mediaSize}`);
    assert.equal(openEndedRange.body.length, mediaSize - 16);

    const malformedRange = await request(app).get(url).set("Range", "bytes=invalid");
    assert.equal(malformedRange.status, 416);
    assert.equal(malformedRange.headers["content-range"], `bytes */${mediaSize}`);
    assert.equal(malformedRange.headers["accept-ranges"], "bytes");

    const unsatisfiable = await request(app).get(url).set("Range", "bytes=999999999-");
    assert.equal(unsatisfiable.status, 416);
    assert.match(unsatisfiable.headers["content-range"], /^bytes \*\//);

    assert.equal((await request(app).get(url).set("Range", "bytes=0-1,4-5")).status, 416);

    await PurchaseEntitlement.updateOne({ userId: user._id }, { $set: { status: "revoked", revokedAt: new Date() } });
    assert.equal((await request(app).get(url).set("Range", "bytes=16-31")).status, 403);
});

test("both public trailer routes reject a byte-identical full movie from persisted references", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-copy-${randomUUID()}.mp4`);
    fs.copyFileSync(mediaPath, trailerPath);
    await Movie.updateOne({ id: movieId }, {
        $set: {
            "media.trailer": path.basename(trailerPath),
            "media.playbackApproved": false
        }
    });

    for (const route of [
        `/api/videos/trailers/${movieId}`,
        `/api/trailers/${movieId}`
    ]) {
        const response = await request(app).get(route);
        assert.equal(response.status, 404, route);
        assert.equal(response.text.includes("trailer-copy"), false);
        assert.equal(response.body.length, undefined);
    }
});

test("both public trailer routes serve distinct previews with correct byte-range and HEAD behavior", async () => {
    const trailerBytes = Buffer.from("distinct preview fixture");
    trailerPath = path.join(trailersDirectory, `trailer-preview-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, trailerBytes, { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    for (const route of [
        `/api/videos/trailers/${movieId}`,
        `/api/trailers/${movieId}`
    ]) {
        const full = await request(app).get(route);
        assert.equal(full.status, 200, route);
        assert.equal(full.headers["content-length"], String(trailerBytes.length));
        assert.equal(full.headers["accept-ranges"], "bytes");
        assert.deepEqual(full.body, trailerBytes);

        const ordinary = await request(app).get(route).set("Range", "bytes=0-7");
        assert.equal(ordinary.status, 206, route);
        assert.equal(ordinary.headers["content-range"], `bytes 0-7/${trailerBytes.length}`);
        assert.equal(ordinary.headers["content-length"], "8");
        assert.equal(ordinary.headers["accept-ranges"], "bytes");
        assert.equal(ordinary.body.toString(), "distinct");

        const suffix = await request(app).get(route).set("Range", "bytes=-8");
        assert.equal(suffix.status, 206, route);
        assert.deepEqual(suffix.body, trailerBytes.subarray(-8));

        const openEnded = await request(app).get(route).set("Range", "bytes=9-");
        assert.equal(openEnded.status, 206, route);
        assert.equal(openEnded.headers["content-range"], `bytes 9-${trailerBytes.length - 1}/${trailerBytes.length}`);
        assert.deepEqual(openEnded.body, trailerBytes.subarray(9));

        for (const range of ["bytes=invalid", "bytes=0-1,4-5", "bytes=999999-"]) {
            const invalid = await request(app).get(route).set("Range", range);
            assert.equal(invalid.status, 416, `${route} ${range}`);
            assert.equal(invalid.headers["content-range"], `bytes */${trailerBytes.length}`);
            assert.equal(invalid.headers["accept-ranges"], "bytes");
        }

        const head = await request(app).head(route);
        assert.equal(head.status, 200, route);
        assert.equal(head.headers["accept-ranges"], "bytes");
        assert.equal(head.headers["content-length"], String(trailerBytes.length));
        assert.equal(head.text, undefined);
    }
});

test("concurrent duplicate-trailer requests do not repeatedly hash the same media versions", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-concurrent-${randomUUID()}.mp4`);
    fs.copyFileSync(mediaPath, trailerPath);

    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const originalOpen = fs.promises.open;
    const digestReads = new Map();

    fs.promises.open = async (...args) => {
        const fileHandle = await originalOpen(...args);
        const openedPath = path.resolve(String(args[0]));

        if (openedPath === path.resolve(trailerPath) ||
            openedPath === path.resolve(mediaPath)) {
            const originalRead = fileHandle.read.bind(fileHandle);

            fileHandle.read = async (...readArgs) => {
                digestReads.set(
                    openedPath,
                    (digestReads.get(openedPath) ?? 0) + 1
                );

                // Give concurrent requests an opportunity to share
                // the in-flight digest calculation.
                await new Promise((resolve) => setTimeout(resolve, 25));

                return originalRead(...readArgs);
            };
        }

        return fileHandle;
    };

    try {
        const route = `/api/videos/trailers/${movieId}`;

        const responses = await Promise.all([
            request(app).get(route),
            request(app).get(route)
        ]);

        assert.deepEqual(
            responses.map((response) => response.status),
            [404, 404],
            "A byte-identical full movie must never be served as a trailer."
        );

        assert.equal(
            digestReads.get(path.resolve(trailerPath)),
            1,
            "The trailer version should be hashed only once."
        );

        assert.equal(
            digestReads.get(path.resolve(mediaPath)),
            1,
            "The matching movie version should be hashed only once."
        );
    } finally {
        fs.promises.open = originalOpen;
    }
});

test("trailer verification fails closed when its file changes during hashing", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-mutating-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, Buffer.from(Array.from(
        { length: 64 },
        (_, index) => index + 1
    )), { flag: "wx" });

    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const originalOpen = fs.promises.open;
    let mutationPerformed = false;

    fs.promises.open = async (...args) => {
        const fileHandle = await originalOpen(...args);

        if (path.resolve(String(args[0])) === path.resolve(trailerPath)) {
            const originalRead = fileHandle.read.bind(fileHandle);

            fileHandle.read = async (...readArgs) => {
                if (!mutationPerformed) {
                    mutationPerformed = true;

                    // Replace the contents with different bytes of the
                    // same length while digest calculation is in progress.
                    fs.writeFileSync(
                        trailerPath,
                        Buffer.alloc(64, 0xA5)
                    );
                }

                return originalRead(...readArgs);
            };
        }

        return fileHandle;
    };

    try {
        const response = await request(app)
            .get(`/api/videos/trailers/${movieId}`);

        assert.equal(mutationPerformed, true);
        assert.equal(
            response.status,
            404,
            "A trailer that changes during verification must not be served."
        );
    } finally {
        fs.promises.open = originalOpen;
    }
});
test("empty trailer files fail closed without starting a response stream", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-empty-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, Buffer.alloc(0), { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const response = await request(app).get(`/api/videos/trailers/${movieId}`);
    assert.equal(response.status, 404);
});

test("response setup exceptions close the verified trailer handle through both public routes", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-setup-error-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, Buffer.from("response setup fixture"), { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    for (const route of [
        `/api/videos/trailers/${movieId}`,
        `/api/trailers/${movieId}`
    ]) {
        const originalWriteHead = app.response.writeHead;
        let injected = false;
        app.response.writeHead = function (statusCode, headers, ...args) {
            if (!injected && headers?.["Content-Type"] === "video/mp4") {
                injected = true;
                throw new Error("synthetic response setup failure");
            }
            return originalWriteHead.call(this, statusCode, headers, ...args);
        };

        try {
            const response = await request(app).get(route);
            assert.equal(injected, true);
            assert.equal(response.status, 500);
        } finally {
            app.response.writeHead = originalWriteHead;
        }
    }
});

test("trailer stream errors close their handle without an unhandled error", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-stream-error-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, Buffer.from("distinct stream error fixture"), { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const originalOpen = fs.promises.open;
    let injectedHandle;
    fs.promises.open = async (...args) => {
        const fileHandle = await originalOpen(...args);
        if (args[0] === trailerPath) {
            injectedHandle = fileHandle;
            fileHandle.createReadStream = () => new Readable({
                read() {
                    this.destroy(new Error("synthetic trailer stream failure"));
                },
                destroy(error, callback) {
                    fileHandle.close().then(() => callback(error), callback);
                }
            });
        }
        return fileHandle;
    };

    try {
        await assert.rejects(
            request(app).get(`/api/trailers/${movieId}`),
            /aborted|reset|socket hang up/i
        );
        assert.ok(injectedHandle);
        assert.equal(injectedHandle.fd, -1);
    } finally {
        fs.promises.open = originalOpen;
    }
});

test("client disconnect closes an active trailer response stream", async () => {
    trailerPath = path.join(trailersDirectory, `trailer-abort-${randomUUID()}.mp4`);
    fs.closeSync(fs.openSync(trailerPath, "wx"));
    fs.truncateSync(trailerPath, 32 * 1024 * 1024);
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const originalOpen = fs.promises.open;
    let openedHandle;
    let responseStream;
    fs.promises.open = async (...args) => {
        const fileHandle = await originalOpen(...args);
        if (args[0] === trailerPath) {
            openedHandle = fileHandle;
            const createReadStream = fileHandle.createReadStream.bind(fileHandle);
            fileHandle.createReadStream = (...streamArgs) => {
                responseStream = createReadStream(...streamArgs);
                return responseStream;
            };
        }
        return fileHandle;
    };

    const server = http.createServer(app);
    try {
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });

        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/trailers/${movieId}`);
        assert.equal(response.status, 200);
        const reader = response.body.getReader();
        const firstChunk = await reader.read();
        assert.equal(firstChunk.done, false);
        await reader.cancel();

        assert.ok(openedHandle);
        assert.ok(responseStream);
        let timeout;
        try {
            await Promise.race([
                responseStream.closed
                    ? Promise.resolve()
                    : new Promise((resolve) => responseStream.once("close", resolve)),
                new Promise((_, reject) => {
                    timeout = setTimeout(() => reject(new Error("Trailer stream did not close after client disconnect.")), 3000);
                })
            ]);
        } finally {
            clearTimeout(timeout);
        }
        assert.equal(openedHandle.fd, -1);
    } finally {
        fs.promises.open = originalOpen;
        if (server.listening) {
            await new Promise((resolve) => server.close(resolve));
        }
    }
});

test("trailer service resolves a preview from the existing trailers directory", async () => {
    const trailerBytes = Buffer.from("stored trailer preview fixture");
    trailerPath = path.join(trailersDirectory, `trailer-resolution-${randomUUID()}.mp4`);
    fs.writeFileSync(trailerPath, trailerBytes, { flag: "wx" });
    await Movie.updateOne({ id: movieId }, {
        $set: { "media.trailer": path.basename(trailerPath) }
    });

    const resolved = await getStoredTrailerStream(movieId);

    assert.equal(resolved.found, true);
    assert.equal(resolved.filePath, trailerPath);
    assert.equal(resolved.fileSize, trailerBytes.length);
    assert.equal(resolved.status, 200);
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
