# StreamFlix Frontend Developer Journal

## Purpose

This document is the production engineering reference for the StreamFlix frontend.

It records:

* frontend architecture decisions
* component architecture
* UI/UX decisions
* state-management decisions
* frontend implementation milestones
* API integration
* media and playback behavior
* responsive design
* accessibility
* performance
* frontend resiliency
* frontend/backend synchronization
* authentication and authorization UI
* notifications
* payment UI
* testing
* Playwright E2E coverage
* browser/device verification
* bugs and fixes
* regressions
* production-readiness milestones
* repository and deployment milestones

The journal must remain up to date as frontend implementation progresses.

---

# Frontend Architecture — Locked Decisions

## 1. Frontend Architecture

StreamFlix uses a modular frontend architecture.

The frontend is organized around:

* components
* controllers
* services
* state
* views
* layouts
* data
* API communication
* styles
* core application logic

Responsibilities must remain separated.

UI components should not become large containers for unrelated business logic.

---

## 2. Data-Driven UI

Frontend content should be driven by structured data wherever appropriate.

Components render data.

Controllers coordinate behavior.

Services handle communication and reusable application operations.

State manages application state.

Styling remains separate from application data.

This allows the frontend to evolve without repeatedly rewriting entire components.

---

## 3. API Integration

The frontend will consume the StreamFlix backend through defined API boundaries.

Frontend code must not directly access backend databases or internal backend services.

The frontend communicates through the API layer.

The API layer may later support:

* authentication
* movie catalogue
* playback
* playlists
* playback progress
* history
* notifications
* payments
* admin operations

---

# 4. MediaRail Architecture

MediaRail is a reusable frontend component.

The MediaRail must remain independent from the Hero component.

MediaRail must not depend on Hero state synchronization.

Each rail owns its own presentation and interaction behavior while consuming structured movie data.

---

## Standard MediaRail Visual Structure

Every standard movie rail follows the established visual structure:

1. Rating badge at the top-right
2. Mini Theatre control centered on the thumbnail
3. Movie title
4. Movie description / metadata
5. Bottom action row

Bottom actions:

* Thumb Up
* Thumb Down
* Playlist / My List
* Download

This visual structure is the frontend source of truth for standard movie rails.

---

# 5. Mini Theatre Architecture

Mini Theatre is the primary frontend playback interface.

Mini Theatre must remain separated from persistent playlist ownership.

Mini Theatre consumes playback information rather than owning persistent playlist data.

The architecture is:

Persistent Playlist
→ Playback Queue
→ Mini Theatre
→ Playback State
→ Playback History

Mini Theatre is therefore a playback consumer/orchestrator, not the persistent playlist database.

---

# 6. Playlist Architecture

The frontend playlist system follows:

## Persistent Playlist

Long-lived user-owned collections.

Examples:

* Watch Later
* Favorites
* Custom Playlists

## Playback Queue

Temporary playback sequence generated from playlist or user actions.

## Playback State

Represents the currently playing movie and playback conditions.

Examples:

* playing
* paused
* progress
* completion
* volume
* playback speed
* quality

## Playback History

Records watched content.

Examples:

* recently played
* continue watching
* completed movies
* playback timeline

---

# 7. Upcoming Cinema

Upcoming Cinema is a dedicated frontend module.

The locked visual direction is:

* full-width muted video preview
* approximately viewport width
* up to approximately 80vh
* metadata and description on the left
* poster on the right
* no unnecessary text over the poster

The preview video is intentionally separated from Mini Theatre playback.

When the user chooses to watch the selected movie, the movie should be handed to Mini Theatre rather than creating a second playback system.

---

# 8. Trailer Architecture

Trailer playback and movie playback are distinct frontend concepts.

Trailer actions must not corrupt persistent movie playback state.

Trailer playback may temporarily take over Mini Theatre while preserving the appropriate previous playback context.

Trailer events must retain clear event contracts.

For example:

`WATCH_TRAILER`

must not silently be redefined to mean:

`OPEN_MOVIE`

Different actions should have explicit event meanings.

---

# 9. Event-Driven Frontend Interaction

Frontend modules communicate through controlled events where appropriate.

Examples:

* movie selected
* trailer selected
* movie opened
* Mini Theatre opened
* playlist updated
* playback started
* playback paused
* playback completed
* progress updated
* movie added to playlist
* movie removed from playlist

Events must have clear ownership and meaning.

Modules should not bypass established controller boundaries without an architectural reason.

---

# 10. Frontend State Management

Frontend state must remain separated according to responsibility.

Primary state domains include:

* Playlist State
* Queue State
* Playback State
* UI State

State changes should have predictable ownership.

Persistent data should not be confused with temporary UI state.

---

# 11. Playback State

Playback state must eventually support production-level synchronization.

Required considerations include:

* current movie
* playback position
* playing/paused state
* completion
* playback speed
* volume
* quality
* resume position
* synchronization with backend
* recovery after interruption

Playback state must remain compatible with the backend source of truth.

---

# 12. Frontend Resiliency

Frontend failures must be handled intentionally.

The frontend must eventually support:

* loading states
* empty states
* error states
* retry actions
* API failure handling
* stale-data handling
* media failure handling
* graceful degradation

The UI should not assume every API request succeeds.

---

# 13. Backend Synchronization

The frontend must correctly synchronize with backend state.

Important areas include:

* movie catalogue
* authentication
* playlists
* playback progress
* playback history
* notifications
* payment state
* admin state

Frontend state must not permanently diverge from backend state.

---

# 14. Responsive Design

Responsive behavior is part of the architecture, not final polish.

The frontend must support:

* desktop
* laptop
* tablet
* mobile

Components should adapt intentionally rather than relying on accidental browser wrapping.

Navigation, rails, Mini Theatre, playback controls and interaction targets must be verified across viewport sizes.

---

# 15. Accessibility

Production frontend implementation will include:

* keyboard navigation
* focus management
* semantic HTML
* accessible controls
* appropriate labels
* usable contrast
* reduced-motion considerations
* screen-reader-friendly interaction where applicable

Accessibility will be verified as features are implemented.

---

# 16. Performance

Frontend performance requirements include:

* efficient rendering
* controlled DOM updates
* optimized media loading
* lazy loading where appropriate
* minimized unnecessary network requests
* appropriate asset handling
* responsive interaction
* production build verification

Performance optimization must not prematurely complicate the architecture.

---

# 17. Authentication UI

Production authentication will eventually include:

* registration
* login
* logout
* session handling
* protected routes/views
* account state
* authorization-aware UI
* secure error handling

Authentication UI must integrate with backend authentication rather than implementing security independently in the browser.

---

# 18. Admin Frontend

A production admin interface will eventually support:

* dashboard
* movie catalogue management
* draft/review/publish workflow
* unpublish/take-down controls
* media-processing status
* synchronization status
* job status
* audit visibility
* user/account administration where appropriate

Admin-only functionality must be protected by backend authorization.

---

# 19. Notifications

The frontend will eventually consume notification events from the backend.

Possible notification types include:

* account events
* playback events
* system events
* payment events
* administrative events

Notifications must have clear read/unread state and appropriate UI behavior.

---

# 20. Payments

Payment UI will be implemented only after the backend payment architecture is established.

The frontend must never treat a client-side payment result as the final source of truth.

Verified backend/webhook state determines payment status.

---

# 21. Playwright E2E Testing

Playwright will provide end-to-end coverage for critical frontend workflows.

Priority workflows include:

* application startup
* movie catalogue loading
* movie selection
* Mini Theatre playback
* trailer playback
* playlist creation
* adding/removing movies
* playback progress
* authentication
* registration
* protected functionality
* admin workflows
* payment workflows
* notification workflows

Tests should verify real user behavior rather than implementation details.

---

# 22. Production Verification

Every meaningful frontend milestone must be verified.

Verification may include:

* development server
* production build
* browser testing
* responsive testing
* media testing
* API integration testing
* Playwright E2E testing
* regression testing

---

# Implementation Journal

## 2026-09-10 — Frontend Developer Journal Established

### Decision

Frontend and backend development documentation are maintained separately.

The backend journal documents backend architecture and implementation.

This journal documents frontend architecture and implementation.

### Status

Frontend journal established.

---

## Existing Frontend Architecture Decisions

### MediaRail

The standard MediaRail structure is locked.

### Mini Theatre

Mini Theatre is the primary playback interface and consumes playback queue/state rather than owning persistent playlists.

### Playlist System

The frontend playlist architecture follows:

Persistent Playlist
→ Playback Queue
→ Mini Theatre
→ Playback State
→ Playback History

### Upcoming Cinema

Upcoming Cinema uses a dedicated muted preview experience and hands selected movies to Mini Theatre for playback.

### Trailer Playback

Trailer playback remains distinct from movie playback and must preserve clear event contracts.

---

# 2026-09-11 — Repository History Reconciliation

## Objective

The StreamFlix repository was audited and reconciled after discovering divergent local and remote Git histories.

The objective was to preserve the current working application while establishing a clean authoritative `main` history.

Before modifying repository history, a complete filesystem backup and Git safety branches were created.

---

## Repository Structure Investigation

Multiple nested Git repositories were discovered inside the StreamFlix project.

The outer repository was established as the authoritative repository.

An obsolete nested repository and stale Gitlink were removed from the active project structure.

The obsolete nested project was archived before removal.

---

## Git Safety Measures

A local safety branch was created:

```text
safety/before-history-reconcile-2026-09-11
```

A second safety branch preserving the previous GitHub `main` history was created:

```text
safety/remote-main-before-reconcile
```

These branches remain available for recovery and comparison.

---

## Duplicate History Investigation

The local and remote histories contained several commits representing identical project snapshots under different commit identities.

Verified equivalent commit pairs included:

```text
c9fd44d ↔ 66421bc
2954fe7 ↔ 1b6cb9d
d346863 ↔ 5bf9ae0
```

Tree comparisons showed no file differences between the corresponding snapshots.

The current local application state was therefore treated as the authoritative development state rather than blindly merging duplicate remote history.

---

## Frontend Media Repository Cleanup

Large video files had previously existed in Git history in multiple locations.

Historical locations included:

```text
assets/videos/movies/
assets/videos/trailers/
src/data/hero/movies/
```

The affected development videos included:

* Blood Sisters
* Gotham
* No One Will Save You

The large media files were removed from the reachable `main` history using `git-filter-repo`.

The physical local media files were intentionally preserved.

This means:

**Git history:** cleaned

**Local development media:** preserved

**Production media:** will eventually use dedicated media storage/CDN/HLS infrastructure

---

## Asset Preservation Decision

Application-facing image assets were preserved in their existing locations.

The cleanup deliberately avoided broad asset consolidation because the frontend currently references multiple image locations.

Image consolidation will be handled later as an explicit frontend refactoring task rather than being mixed into repository-history cleanup.

---

## Frontend Verification

After the repository reconciliation, the StreamFlix application was opened and confirmed to load normally.

Verification result:

| Verification                                    | Result |
| ----------------------------------------------- | ------ |
| Frontend application loads                      | PASS   |
| Existing application behavior                   | PASS   |
| Local media remains available                   | PASS   |
| Working tree                                    | CLEAN  |
| Large video files reachable from `main` history | NONE   |
| GitHub synchronization                          | PASS   |

The repository cleanup did not break the frontend application.

---

## Final Git State

The cleaned `main` commit is:

```text
a690bdabd6733d559e45778301764f2eaf29f8d3
```

Commit:

```text
chore: reconcile StreamFlix repository history
```

The cleaned history was pushed to GitHub using:

```text
git push --force-with-lease origin main
```

Final verification confirmed:

```text
main        = a690bdabd6733d559e45778301764f2eaf29f8d3
origin/main = a690bdabd6733d559e45778301764f2eaf29f8d3
```

Git status:

```text
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

---

## Repository Reconciliation Status

**Status: COMPLETE**

The frontend repository is now synchronized with GitHub and ready for the next controlled development/deployment phase.

The safety branches remain intentionally preserved until the cleaned repository has been fully validated.

---

# Frontend Production Verification Log

Verification must be added after every meaningful implementation milestone.

Format:

### Date

**Change:**

**Test:**

**Expected:**

**Result:**

**Status:** PASS / FAIL

**Notes:**

---

## 2026-09-11 — Repository Reconciliation Verification

**Change:**

Reconciled StreamFlix Git history, removed large historical video blobs from reachable `main` history, preserved local development media, and synchronized the cleaned history with GitHub.

**Test:**

* Open StreamFlix application.
* Verify frontend loads.
* Inspect Git working tree.
* Compare local `main` with `origin/main`.
* Search reachable `main` history for video files.

**Expected:**

* Application loads normally.
* Local development media remains available.
* Working tree is clean.
* `main` and `origin/main` point to the same commit.
* No MP4/MKV/WebM/MOV/AVI files remain reachable from `main` history.

**Result:**

All verification checks passed.

**Status:** PASS

**Notes:**

The cleanup removed historical video blobs from Git history without deleting the physical development media required by the local application.

---

# Deployment Readiness

The frontend repository has completed its Git history reconciliation and application verification.

The next phase is controlled deployment.

Deployment must preserve the following principles:

1. StreamFlix must not be made publicly accessible prematurely.
2. Deployment access must be protected while development continues.
3. Local development media must not be assumed to exist in the production deployment.
4. Production media architecture will eventually use dedicated storage/CDN/HLS infrastructure.
5. Deployment configuration must remain separate from local development configuration.
6. Environment variables must not be committed to Git.
7. Frontend API configuration must point to the appropriate deployed backend when production integration begins.
8. Production deployment must be verified before being treated as a stable environment.

---

# Frontend Change Control Rules

1. Do not remove locked frontend architecture decisions without explicitly revisiting the decision.
2. Do not rewrite stable components unnecessarily.
3. Keep data, presentation, state, controllers and services separated.
4. Do not duplicate playback systems.
5. Mini Theatre remains the central playback interface.
6. Persistent playlists remain separate from temporary playback queues.
7. Frontend state must remain synchronized with backend state.
8. Loading, empty, error and recovery states are production requirements.
9. Responsive behavior is part of implementation, not optional polish.
10. Accessibility is a production requirement.
11. Playwright E2E coverage will protect critical user workflows.
12. Performance optimization must be evidence-driven.
13. Frontend security must defer authoritative decisions to the backend.
14. Do not introduce unnecessary features before the architecture requires them.
15. Every meaningful implementation must be verified and documented.
16. Repository history changes must be preceded by appropriate backups and safety branches.
17. Large binary media must not be committed to the production Git repository.
18. Local development media and production media must be treated as separate concerns.
19. Deployment configuration must never compromise local development workflows.
20. Private deployment must be verified before exposing StreamFlix publicly.
