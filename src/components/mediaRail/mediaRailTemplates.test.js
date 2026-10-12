import test from "node:test";
import assert from "node:assert/strict";
import { mediaRailTemplates } from "./mediaRailTemplates.js";

test("media rail labels missing full movies unavailable and disables Theatre", () => {
    const html = mediaRailTemplates.item({
        id: 1,
        title: "Blood Sisters",
        playbackAvailable: false,
        video: null,
        streamUrl: null
    });

    assert.match(html, /data-action="theatre"[^>]*disabled/s);
    assert.match(html, /Unavailable/);
    assert.match(html, /Full movie unavailable for Blood Sisters/);
});

test("media rail enables Theatre only for an advertised playback source", () => {
    const html = mediaRailTemplates.item({
        id: 2,
        title: "Verified fixture",
        playbackAvailable: true,
        video: "http://localhost:5000/api/videos/2",
        streamUrl: "http://localhost:5000/api/videos/2"
    });

    assert.doesNotMatch(html, /data-action="theatre"[^>]*disabled/s);
    assert.match(html, />\s*Theatre\s*</);
});
