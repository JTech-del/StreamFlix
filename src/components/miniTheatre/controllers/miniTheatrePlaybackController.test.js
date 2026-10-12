import test from "node:test";
import assert from "node:assert/strict";
import { miniTheatrePlaybackController as controller } from "./miniTheatrePlaybackController.js";
import { miniTheatreView } from "../miniTheatreView.js";
import { watchProgressController } from "../watchProgress/watchProgressController.js";

test("an unavailable selection unloads old playback without requesting a grant", async () => {
    const originalState = controller.state;
    const originalHandlers = controller.activeMediaHandlers;
    const originalSync = controller.syncActiveCard;
    const originalGetVideo = miniTheatreView.getVideo;
    const originalRenderMovie = miniTheatreView.renderMovie;
    const originalShowError = miniTheatreView.showPlaybackError;
    const originalSave = watchProgressController.save;
    const originalStopAutoSave = watchProgressController.stopAutoSave;
    const originalFetch = globalThis.fetch;

    let errorHandler;
    let playingHandler;
    let paused = false;
    let removed = 0;
    let grantRequests = 0;
    let rendered;
    let shownError;

    const oldVideo = {
        paused: false,
        pause() { paused = true; },
        removeEventListener(type, handler) {
            if ((type === "error" && handler === errorHandler) ||
                (type === "playing" && handler === playingHandler)) removed += 1;
        }
    };

    controller.state = {
        movie: { id: 99, title: "Previously playing" },
        index: 0,
        isPlaying: true,
        isPaused: false,
        isCompleted: false,
        progress: 25
    };
    errorHandler = () => {};
    playingHandler = () => {};
    controller.activeMediaHandlers = { video: oldVideo, onMediaError: errorHandler, onMediaPlaying: playingHandler };
    controller.syncActiveCard = () => {};
    miniTheatreView.getVideo = () => oldVideo;
    miniTheatreView.renderMovie = (movie) => { rendered = movie; };
    miniTheatreView.showPlaybackError = (message) => { shownError = message; };
    watchProgressController.save = () => {};
    watchProgressController.stopAutoSave = () => {};
    globalThis.fetch = async () => { grantRequests += 1; throw new Error("unexpected network request"); };

    try {
        const started = await controller.handleMovieSelected({
            id: 1,
            title: "Blood Sisters",
            video: null,
            streamUrl: null,
            playbackAvailable: false
        });

        assert.equal(started, false);
        assert.equal(paused, true);
        assert.equal(removed, 2);
        assert.equal(controller.activeMediaHandlers, null);
        assert.equal(controller.state.movie, null);
        assert.equal(controller.state.index, -1);
        assert.equal(rendered.id, 1);
        assert.equal(rendered.streamUrl, null);
        assert.match(shownError, /unavailable|verification/i);
        assert.equal(grantRequests, 0);
    } finally {
        controller.state = originalState;
        controller.activeMediaHandlers = originalHandlers;
        controller.syncActiveCard = originalSync;
        miniTheatreView.getVideo = originalGetVideo;
        miniTheatreView.renderMovie = originalRenderMovie;
        miniTheatreView.showPlaybackError = originalShowError;
        watchProgressController.save = originalSave;
        watchProgressController.stopAutoSave = originalStopAutoSave;
        globalThis.fetch = originalFetch;
    }
});
