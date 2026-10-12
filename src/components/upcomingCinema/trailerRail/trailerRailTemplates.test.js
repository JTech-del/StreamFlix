import test from "node:test";
import assert from "node:assert/strict";
import { trailerRailTemplates } from "./trailerRailTemplates.js";

test("YouTube trailer cards render a privacy-enhanced iframe preview", () => {
    const html = trailerRailTemplates.card({
        id: 2,
        title: "No One Will Save You",
        trailerProvider: "youtube",
        trailerUrl: "https://www.youtube-nocookie.com/embed/IcA02w6rm44?autoplay=1"
    });

    assert.match(html, /<iframe/);
    assert.match(html, /youtube-nocookie\.com\/embed\/IcA02w6rm44/);
    assert.match(html, /mute=1/);
    assert.doesNotMatch(html, /data-trailer-video/);
});

test("direct trailer assets remain HTML video sources", () => {
    const html = trailerRailTemplates.card({
        id: 9,
        title: "Licensed Preview",
        trailerProvider: "file",
        trailerUrl: "http://localhost:5000/api/trailers/9"
    });

    assert.match(html, /<video/);
    assert.match(html, /src="http:\/\/localhost:5000\/api\/trailers\/9"/);
});

test("unsupported trailer URLs do not become executable preview sources", () => {
    const html = trailerRailTemplates.card({
        id: 10,
        title: "Invalid",
        trailerUrl: "javascript:alert(1)"
    });

    assert.doesNotMatch(html, /<iframe/);
    assert.doesNotMatch(html, /<video/);
});
