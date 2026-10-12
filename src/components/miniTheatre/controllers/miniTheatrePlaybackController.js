"use strict";

/*==================================================
    StreamFlix
    Mini Theatre Playback Controller V3

    Responsibilities:
    - Manage playback lifecycle
    - Coordinate playlist and watch progress
    - Synchronize active playlist card
    - Support temporary trailer playback
    - Restore previous playback after trailers
    - Handle movie removal
    - Prevent stale playback requests
==================================================*/

import { miniTheatreView } from "../miniTheatreView.js";
import { playlistController } from "../playlist/playlistController.js";
import { watchProgressController } from "../watchProgress/watchProgressController.js";
import { getAuthorizedStreamUrl } from "../../../api/movieApi.js";

class MiniTheatrePlaybackController {
    constructor() {
        this.state = {
            movie: null,
            index: -1,
            isPlaying: false,
            isPaused: false,
            isCompleted: false,
            progress: 0
        };

        this.temporaryTrailer = null;
        this.playbackRequest = 0;
        this.selectionRequest = 0;
        this.authorizedStreamUrl = null;
        this.recoveryAttempted = false;
        this.activeMediaHandlers = null;
    }

    async play(movie) {
        if (!movie) return false;
        return this.handleMovieSelected(movie);
    }

    async handleMovieSelected(movie) {
        if (!movie) return false;

        if (!movie.video || !movie.streamUrl) {
            // A rejected selection still replaces the current theatre content.
            // Otherwise the previous media source can keep playing and emit a
            // confusing error after the user selected a different title.
            ++this.selectionRequest;
            this.stopCurrentPlayback();
            this.state.movie = null;
            this.state.index = -1;
            this.state.isPlaying = false;
            this.state.isPaused = false;
            this.state.isCompleted = false;
            this.state.progress = 0;
            this.authorizedStreamUrl = null;
            miniTheatreView.renderMovie({ ...movie, streamUrl: null });
            miniTheatreView.showPlaybackError(
                "A full movie is unavailable or still awaiting asset verification."
            );
            this.syncActiveCard();
            return false;
        }

        const selectionRequest = ++this.selectionRequest;
        let authorizedStreamUrl;
        try {
            authorizedStreamUrl = await getAuthorizedStreamUrl(movie.id);
        } catch (error) {
            if (selectionRequest === this.selectionRequest) {
                const status = error.status;
                miniTheatreView.showPlaybackError(
                    status === 401 || status === 403
                        ? "Sign in and confirm your movie access before playback."
                        : status === 404
                            ? "This movie does not have an available full video."
                            : "Playback authorization is unavailable. Check your connection and retry.",
                    () => void this.handleMovieSelected(movie)
                );
            }
            return false;
        }
        if (selectionRequest !== this.selectionRequest) return false;

        const previous = this.captureCurrentPlayback();

        this.stopCurrentPlayback();

        let index = playlistController.indexOf(movie);

        if (index === -1) {
            const added = playlistController.add(movie);

            if (!added) {
                console.error("Mini Theatre: Failed to add movie to playlist.", movie);
                this.restoreCapturedState(previous);
                return false;
            }

            index = playlistController.indexOf(movie);
        }

        if (!Number.isInteger(index) || index < 0) {
            console.error("Mini Theatre: Movie could not be located in playlist.", movie);
            this.restoreCapturedState(previous);
            return false;
        }

        const activeMovie = playlistController.setCurrent(index);

        if (!activeMovie) {
            console.error("Mini Theatre: Failed to activate playlist movie.", movie);
            this.restoreCapturedState(previous);
            return false;
        }

        this.state.movie = activeMovie;
        this.authorizedStreamUrl = authorizedStreamUrl;
        this.recoveryAttempted = false;
        this.state.index = index;
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isCompleted = playlistController.isCompleted(activeMovie);
        this.state.progress = this.state.isCompleted ? 100 : 0;

        if (previous && previous.index !== -1 && previous.index !== index) {
            this.updatePreviousCard(previous);
        }

        this.renderCurrentMovie();

        if (this.state.isCompleted) {
            this.syncActiveCard();
            return true;
        }

        return this.startPlayback();
    }

    renderCurrentMovie() {
        const movie = this.state.movie;

        if (!movie) {
            miniTheatreView.renderEmpty();
            return;
        }

        miniTheatreView.renderMovie({
            ...movie,
            streamUrl: this.authorizedStreamUrl
        });
        miniTheatreView.bindEnded(() => this.handlePlaybackEnded());
        miniTheatreView.setActive(this.state.index);
        miniTheatreView.scrollToActive(this.state.index);

        const video = miniTheatreView.getVideo();

        if (!video) {
            this.syncActiveCard();
            return;
        }

        watchProgressController.init(video);
        watchProgressController.setMovie(movie);
        watchProgressController.restore();
        const onMediaError = () => {
            void this.recoverOrReportMediaError(video, movie);
        };
        const onMediaPlaying = () => {
            this.recoveryAttempted = false;
            miniTheatreView.clearPlaybackError();
        };
        video.addEventListener("error", onMediaError);
        video.addEventListener("playing", onMediaPlaying);
        this.activeMediaHandlers = { video, onMediaError, onMediaPlaying };

        const progress = watchProgressController.getProgress();

        if (Number.isFinite(progress)) {
            this.state.progress = Math.max(0, Math.min(100, progress));
        }

        if (this.hasResumeProgress()) {
            miniTheatreView.showResumePrompt(this.state.progress);
        }

        this.syncActiveCard();
    }

    async recoverOrReportMediaError(video, movie) {
        if (video !== miniTheatreView.getVideo()) return;

        let probe;
        try {
            probe = await fetch(video.currentSrc || video.src, {
                headers: { Range: "bytes=0-0" },
                cache: "no-store",
                referrerPolicy: "no-referrer"
            });
            await probe.body?.cancel();
        } catch {
            miniTheatreView.showPlaybackError("The video could not be reached. Check your connection and retry.",
                () => void this.retryCurrentPlayback());
            return;
        }

        if (probe.status === 401) {
            if (this.recoveryAttempted) {
                miniTheatreView.showPlaybackError("Playback authorization expired. Retry to obtain fresh access.",
                    () => void this.retryCurrentPlayback());
                return;
            }
            this.recoveryAttempted = true;
            try {
                const position = Number.isFinite(video.currentTime) ? video.currentTime : 0;
                this.authorizedStreamUrl = await getAuthorizedStreamUrl(movie.id);
                if (video !== miniTheatreView.getVideo()) return;
                video.addEventListener("loadedmetadata", () => {
                    try { video.currentTime = position; } catch { /* metadata may reject seek */ }
                    void video.play().then(() => {
                        this.state.isPlaying = true;
                        this.state.isPaused = false;
                        watchProgressController.startAutoSave();
                    }).catch(() => {});
                }, { once: true });
                video.src = this.authorizedStreamUrl;
                video.load();
            } catch (error) {
                miniTheatreView.showPlaybackError(
                    error?.status === 401 || error?.status === 403
                        ? "Movie access is no longer active. Sign in again or check your purchase."
                        : "A fresh playback authorization could not be obtained. Retry when connected.",
                    () => void this.retryCurrentPlayback()
                );
            }
            return;
        }

        if (probe.status === 403) {
            miniTheatreView.showPlaybackError("Movie access is no longer active. Sign in again or check your purchase.");
            return;
        }
        if (!probe.ok && probe.status !== 206) {
            miniTheatreView.showPlaybackError("The video could not be reached. Check your connection and retry.",
                () => void this.retryCurrentPlayback());
            return;
        }

        const unsupported = video.error?.code === 4;
        miniTheatreView.showPlaybackError(
            unsupported
                ? "This browser cannot decode this video format."
                : "Playback failed. Check your connection and retry.",
            () => void this.retryCurrentPlayback()
        );
    }

    async retryCurrentPlayback() {
        const movie = this.state.movie;
        const video = miniTheatreView.getVideo();
        if (!movie || !video) return false;
        try {
            this.authorizedStreamUrl = await getAuthorizedStreamUrl(movie.id);
            const position = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            return await new Promise((resolve) => {
                const onMetadata = () => {
                    cleanup();
                    try { video.currentTime = position; } catch { /* metadata may reject seek */ }
                    this.startPlayback().then(resolve, () => resolve(false));
                };
                const cleanup = () => {
                    window.clearTimeout(timeout);
                    video.removeEventListener("loadedmetadata", onMetadata);
                };
                const timeout = window.setTimeout(() => {
                    cleanup();
                    resolve(false);
                }, 12000);
                video.addEventListener("loadedmetadata", onMetadata, { once: true });
                video.src = this.authorizedStreamUrl;
                video.load();
            });
        } catch (error) {
            miniTheatreView.showPlaybackError(
                error.status === 401 || error.status === 403
                    ? "Playback authorization failed. Sign in again or check your purchase."
                    : "Playback could not be retried. Check your connection."
            );
            return false;
        }
    }

    async startPlayback() {
        const movie = this.state.movie;

        if (!movie) return false;

        if (this.state.isCompleted || playlistController.isCompleted(movie)) {
            this.state.isCompleted = true;
            this.state.isPlaying = false;
            this.state.isPaused = false;
            this.state.progress = 100;
            this.syncActiveCard();
            return false;
        }

        const video = miniTheatreView.getVideo();
        if (!video) return false;

        const requestId = ++this.playbackRequest;

        watchProgressController.restore();

        let started = false;

        try {
            started = await miniTheatreView.playVideo();
        } catch (error) {
            if (requestId === this.playbackRequest) {
                console.error("Mini Theatre: Playback failed.", error);
            }
            return false;
        }

        if (requestId !== this.playbackRequest) return false;

        if (!started) {
            this.state.isPlaying = false;
            this.state.isPaused = false;
            this.syncActiveCard();
            return false;
        }

        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.isCompleted = false;

        watchProgressController.startAutoSave();
        this.syncActiveCard();

        return true;
    }

    pausePlayback() {
        if (!this.state.movie) return false;

        const video = miniTheatreView.getVideo();
        if (!video) return false;

        miniTheatreView.pauseVideo();
        watchProgressController.save();
        watchProgressController.stopAutoSave();

        this.state.isPlaying = false;
        this.state.isPaused = true;
        this.state.isCompleted = false;

        this.updateStateProgress();
        this.syncActiveCard();

        return true;
    }

    async resumePlayback() {
        if (!this.state.movie) return false;

        if (
            this.state.isCompleted ||
            playlistController.isCompleted(this.state.movie)
        ) {
            return false;
        }

        return this.startPlayback();
    }

    stopPlayback() {
        this.stopCurrentPlayback();

        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isCompleted = false;

        this.updateStateProgress();
        this.syncActiveCard();
    }

    stopCurrentPlayback() {
        this.playbackRequest++;

        if (this.activeMediaHandlers) {
            const { video, onMediaError, onMediaPlaying } = this.activeMediaHandlers;
            video.removeEventListener("error", onMediaError);
            video.removeEventListener("playing", onMediaPlaying);
            this.activeMediaHandlers = null;
        }

        if (this.state.movie) {
            try {
                watchProgressController.save();
            } catch (error) {
                console.warn("Mini Theatre: Failed to save watch progress.", error);
            }
        }

        watchProgressController.stopAutoSave();

        const video = miniTheatreView.getVideo();
        if (!video) return;

        try {
            video.pause();
        } catch (error) {
            console.warn("Mini Theatre: Failed to pause video.", error);
        }
    }

    skip(seconds = 0) {
        const video = miniTheatreView.getVideo();

        if (!video || !Number.isFinite(seconds)) return;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;

        video.currentTime = Math.max(
            0,
            Math.min(video.duration, video.currentTime + seconds)
        );
    }

    handlePlaybackEnded() {
        if (this.temporaryTrailer) {
            void this.restorePreviousTheatre();
            return;
        }

        if (!this.state.movie) return;

        watchProgressController.stopAutoSave();

        try {
            watchProgressController.save();
        } catch (error) {
            console.warn("Mini Theatre: Failed to save final progress.", error);
        }

        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isCompleted = true;
        this.state.progress = 100;

        const result = playlistController.complete(this.state.index);
        this.syncActiveCard();

        if (result) {
            console.log(
                "Mini Theatre: Movie completed.",
                result.movie && result.movie.title
            );
        }
    }

    captureCurrentPlayback() {
        if (!this.state.movie) return null;

        const video = miniTheatreView.getVideo();

        let currentTime = 0;
        let duration = 0;
        let progress = this.state.progress;

        if (video) {
            currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            duration = Number.isFinite(video.duration) ? video.duration : 0;

            if (duration > 0) {
                progress = (currentTime / duration) * 100;
            }
        }

        return {
            movie: this.state.movie,
            index: this.state.index,
            currentTime,
            duration,
            progress: Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0)),
            wasPlaying: this.state.isPlaying,
            wasPaused: this.state.isPaused,
            wasCompleted: this.state.isCompleted
        };
    }

    restoreCapturedState(snapshot) {
        if (!snapshot) return;

        this.state.movie = snapshot.movie;
        this.state.index = snapshot.index;
        this.state.isPlaying = snapshot.wasPlaying;
        this.state.isPaused = snapshot.wasPaused;
        this.state.isCompleted = snapshot.wasCompleted;
        this.state.progress = snapshot.progress;
    }

    updatePreviousCard(previous) {
        if (!previous) return;

        if (previous.wasCompleted) {
            miniTheatreView.updateCardState(previous.index, {
                status: "🔵 COMPLETE",
                progress: 100,
                completed: true,
                playing: false,
                paused: false,
                resume: false,
                play: false,
                pause: false
            });
            return;
        }

        if (previous.wasPlaying || previous.wasPaused) {
            miniTheatreView.updateCardState(previous.index, {
                status: "🟡 PAUSED",
                progress: previous.progress,
                completed: false,
                playing: false,
                paused: true,
                resume: true,
                play: false,
                pause: false
            });
            return;
        }

        miniTheatreView.updateCardState(previous.index, {
            status: "⚪ READY",
            progress: previous.progress,
            completed: false,
            playing: false,
            paused: false,
            resume: false,
            play: true,
            pause: false
        });
    }

    syncActiveCard() {
        const index = this.state.index;

        if (!Number.isInteger(index) || index < 0) return;

        const completed =
            this.state.isCompleted ||
            Boolean(
                this.state.movie &&
                playlistController.isCompleted(this.state.movie)
            );

        if (completed) {
            miniTheatreView.updateCardState(index, {
                status: "🔵 COMPLETE",
                progress: 100,
                completed: true,
                playing: false,
                paused: false,
                resume: false,
                play: false,
                pause: false
            });
            return;
        }

        if (this.state.isPlaying) {
            miniTheatreView.updateCardState(index, {
                status: "🔴 PLAYING",
                progress: this.state.progress,
                completed: false,
                playing: true,
                paused: false,
                resume: false,
                play: false,
                pause: true
            });
            return;
        }

        if (this.state.isPaused) {
            miniTheatreView.updateCardState(index, {
                status: "🟡 PAUSED",
                progress: this.state.progress,
                completed: false,
                playing: false,
                paused: true,
                resume: true,
                play: false,
                pause: false
            });
            return;
        }

        miniTheatreView.updateCardState(index, {
            status: "⚪ READY",
            progress: this.state.progress,
            completed: false,
            playing: false,
            paused: false,
            resume: false,
            play: true,
            pause: false
        });
    }

    updateProgress(progress) {
        if (!Number.isFinite(progress)) return;

        this.state.progress = Math.max(0, Math.min(100, progress));
        this.syncActiveCard();
    }

    updateStateProgress() {
        const video = miniTheatreView.getVideo();
        if (!video) return;

        const currentTime = Number(video.currentTime);
        const duration = Number(video.duration);

        if (
            Number.isFinite(currentTime) &&
            Number.isFinite(duration) &&
            duration > 0
        ) {
            this.updateProgress((currentTime / duration) * 100);
        }
    }

    hasResumeProgress() {
        return this.state.progress > 0 && this.state.progress < 95;
    }

    resolveTrailerSource(trailer) {
        if (typeof trailer === "string") return trailer;

        if (typeof trailer !== "object" || trailer === null) return null;

        return (
            trailer.trailer ||
            trailer.trailerUrl ||
            trailer.url ||
            trailer.src ||
            trailer.video ||
            null
        );
    }

    isYouTubeEmbedUrl(source) {
        if (typeof source !== "string") return false;

        try {
            const parsed = new URL(source);

            return (
                parsed.protocol === "https:" &&
                parsed.origin === "https://www.youtube-nocookie.com" &&
                /^\/embed\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname)
            );
        } catch {
            return false;
        }
    }

    async playTrailer(trailer) {
        if (!trailer || this.temporaryTrailer) return false;

        const trailerSource = this.resolveTrailerSource(trailer);

        if (typeof trailerSource !== "string" || !trailerSource.trim()) {
            console.error("Mini Theatre: Trailer source is missing or invalid.");
            return false;
        }

        let parsedSource;

        try {
            parsedSource = new URL(trailerSource);
        } catch {
            console.error("Mini Theatre: Trailer URL is invalid.");
            return false;
        }

        if (!["https:", "http:"].includes(parsedSource.protocol)) {
            console.error("Mini Theatre: Unsupported trailer URL protocol.");
            return false;
        }

        const isYouTubeEmbed = this.isYouTubeEmbedUrl(trailerSource);

        if (parsedSource.hostname === "youtube-nocookie.com" && !isYouTubeEmbed) {
            console.error("Mini Theatre: Invalid YouTube embed URL.");
            return false;
        }

        const previous = this.captureCurrentPlayback();

        this.stopCurrentPlayback();

        const requestId = ++this.playbackRequest;

        this.temporaryTrailer = { previous, trailer };

        try {
            const temporaryMovie = this.createTemporaryTrailerMovie(trailer);

            miniTheatreView.renderMovie(temporaryMovie);
            miniTheatreView.bindEnded(() => this.handlePlaybackEnded());

            const video = miniTheatreView.getVideo();

            if (!isYouTubeEmbed && !video) {
                await this.restorePreviousTheatre();
                return false;
            }

            if (video) {
                video.pause();
                video.removeAttribute("src");

                video.querySelectorAll("source").forEach((source) => {
                    source.removeAttribute("src");
                });

                video.load();
                video.hidden = true;
            }

            this.state.movie = null;
            this.state.index = -1;
            this.state.isPlaying = false;
            this.state.isPaused = false;
            this.state.isCompleted = false;
            this.state.progress = 0;

            let started;

            if (isYouTubeEmbed) {
                started = await miniTheatreView.playYouTubeTrailer(trailerSource, {
                    onEnded: () => this.handlePlaybackEnded(),
                    onError: () => {
                        void this.restorePreviousTheatre();
                    }
                });
            } else {
                video.src = trailerSource;
                video.load();
                started = await miniTheatreView.playVideo();
            }

            if (requestId !== this.playbackRequest) return false;

            if (!started) {
                await this.restorePreviousTheatre();
                return false;
            }

            return true;
        } catch (error) {
            console.error("Mini Theatre: Trailer playback failed.", error);

            if (this.temporaryTrailer) {
                await this.restorePreviousTheatre();
            }

            return false;
        }
    }

    createTemporaryTrailerMovie(trailer) {
        if (typeof trailer === "object" && trailer !== null) {
            return {
                ...trailer,
                title: trailer.title || "Trailer",
                description: trailer.description || "Trailer"
            };
        }

        return {
            id: "temporary-trailer",
            slug: "temporary-trailer",
            title: "Trailer",
            description: "Trailer",
            poster: "",
            year: "",
            duration: "",
            rating: "",
            quality: ""
        };
    }

    async restorePreviousTheatre() {
        const temporary = this.temporaryTrailer;

        if (!temporary) return;

        this.temporaryTrailer = null;

        const requestId = ++this.playbackRequest;
        const previous = temporary.previous;

        if (!previous) {
            this.resetState();
            miniTheatreView.renderEmpty();
            return;
        }

        this.state.movie = previous.movie;
        this.state.index = previous.index;
        this.state.isCompleted = previous.wasCompleted;
        this.state.isPlaying = false;
        this.state.isPaused = previous.wasPaused;
        this.state.progress = previous.progress;

        this.renderCurrentMovie();

        const video = miniTheatreView.getVideo();

        if (!video) {
            this.syncActiveCard();
            return;
        }

        const restorePosition = () => {
            if (!Number.isFinite(previous.currentTime)) return;
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;

            try {
                video.currentTime = Math.max(
                    0,
                    Math.min(video.duration, previous.currentTime)
                );
            } catch (error) {
                console.warn("Mini Theatre: Could not restore playback position.", error);
            }
        };

        if (video.readyState >= 1) {
            restorePosition();
        } else {
            video.addEventListener("loadedmetadata", restorePosition, { once: true });
        }

        if (previous.wasCompleted) {
            this.state.isCompleted = true;
            this.state.isPlaying = false;
            this.state.isPaused = false;
            this.state.progress = 100;
            this.syncActiveCard();
            return;
        }

        if (previous.wasPaused) {
            this.state.isPlaying = false;
            this.state.isPaused = true;
            this.syncActiveCard();
            return;
        }

        if (previous.wasPlaying) {
            try {
                const started = await miniTheatreView.playVideo();

                if (requestId !== this.playbackRequest) return;

                if (started) {
                    this.state.isPlaying = true;
                    this.state.isPaused = false;
                    this.state.isCompleted = false;
                    watchProgressController.startAutoSave();
                }
            } catch (error) {
                console.error("Mini Theatre: Failed to restore previous playback.", error);
            }

            this.syncActiveCard();
            return;
        }

        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.syncActiveCard();
    }

    removeCurrentMovie() {
        const movie = this.state.movie;

        if (!movie) return null;

        const currentIndex = this.state.index;

        this.stopCurrentPlayback();

        const removed = playlistController.remove(movie);
        if (!removed) return null;

        const movies = playlistController.getAll();

        if (!movies.length) {
            this.resetState();
            miniTheatreView.renderPlaylist([]);
            miniTheatreView.renderEmpty();
            return removed;
        }

        let nextIndex = playlistController.getCurrentIndex();

        if (
            !Number.isInteger(nextIndex) ||
            nextIndex < 0 ||
            nextIndex >= movies.length
        ) {
            nextIndex = Math.min(currentIndex, movies.length - 1);
        }

        const nextMovie = playlistController.setCurrent(nextIndex);

        if (!nextMovie) {
            this.resetState();
            miniTheatreView.renderEmpty();
            return removed;
        }

        this.state.movie = nextMovie;
        this.state.index = nextIndex;
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isCompleted = playlistController.isCompleted(nextMovie);
        this.state.progress = this.state.isCompleted ? 100 : 0;

        this.renderCurrentMovie();

        return removed;
    }

    resetState() {
        this.state.movie = null;
        this.state.index = -1;
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isCompleted = false;
        this.state.progress = 0;
    }

    clear() {
        this.stopCurrentPlayback();
        this.resetState();
        this.temporaryTrailer = null;
        this.playbackRequest++;
        this.selectionRequest++;
        this.authorizedStreamUrl = null;
        this.recoveryAttempted = false;
        miniTheatreView.clear();
    }
}

export const miniTheatrePlaybackController =
    new MiniTheatrePlaybackController();
