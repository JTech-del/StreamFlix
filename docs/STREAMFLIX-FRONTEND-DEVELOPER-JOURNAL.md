@'
# StreamFlix Frontend Developer Journal

## Purpose

This document is the production engineering reference for the StreamFlix frontend.

It records:

- frontend architecture decisions
- component architecture
- UI/UX decisions
- state-management decisions
- frontend implementation milestones
- API integration
- media and playback behavior
- responsive design
- accessibility
- performance
- frontend resiliency
- frontend/backend synchronization
- authentication and authorization UI
- notifications
- payment UI
- testing
- Playwright E2E coverage
- browser/device verification
- bugs and fixes
- regressions
- production-readiness milestones

The journal must remain up to date as frontend implementation progresses.

---

# Frontend Architecture — Locked Decisions

## 1. Frontend Architecture

StreamFlix uses a modular frontend architecture.

The frontend is organized around:

- components
- controllers
- services
- state
- views
- layouts
- data
- API communication
- styles
- core application logic

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

- authentication
- movie catalogue
- playback
- playlists
- playback progress
- history
- notifications
- payments
- admin operations

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

- Thumb Up
- Thumb Down
- Playlist / My List
- Download

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

- Watch Later
- Favorites
- Custom Playlists

## Playback Queue

Temporary playback sequence generated from playlist or user actions.

## Playback State

Represents the currently playing movie and playback conditions.

Examples:

- playing
- paused
- progress
- completion
- volume
- playback speed
- quality

## Playback History

Records watched content.

Examples:

- recently played
- continue watching
- completed movies
- playback timeline

---

# 7. Upcoming Cinema

Upcoming Cinema is a dedicated frontend module.

The locked visual direction is:

- full-width muted video preview
- approximately viewport width
- up to approximately 80vh
- metadata and description on the left
- poster on the right
- no unnecessary text over the poster

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

- movie selected
- trailer selected
- movie opened
- Mini Theatre opened
- playlist updated
- playback started
- playback paused
- playback completed
- progress updated
- movie added to playlist
- movie removed from playlist

Events must have clear ownership and meaning.

Modules should not bypass established controller boundaries without an architectural reason.

---

# 10. Frontend State Management

Frontend state must remain separated according to responsibility.

Primary state domains include:

- Playlist State
- Queue State
- Playback State
- UI State

State changes should have predictable ownership.

Persistent data should not be confused with temporary UI state.

---

# 11. Playback State

Playback state must eventually support production-level synchronization.

Required considerations include:

- current movie
- playback position
- playing/paused state
- completion
- playback speed
- volume
- quality
- resume position
- synchronization with backend
- recovery after interruption

Playback state must remain compatible with the backend source of truth.

---

# 12. Frontend Resiliency

Frontend failures must be handled intentionally.

The frontend must eventually support:

- loading states
- empty states
- error states
- retry actions
- API failure handling
- stale-data handling
- media failure handling
- graceful degradation

The UI should not assume every API request succeeds.

---

# 13. Backend Synchronization

The frontend must correctly synchronize with backend state.

Important areas include:

- movie catalogue
- authentication
- playlists
- playback progress
- playback history
- notifications
- payment state
- admin state

Frontend state must not permanently diverge from backend state.

---

# 14. Responsive Design

Responsive behavior is part of the architecture, not final polish.

The frontend must support:

- desktop
- laptop
- tablet
- mobile

Components should adapt intentionally rather than relying on accidental browser wrapping.

Navigation, rails, Mini Theatre, playback controls and interaction targets must be verified across viewport sizes.

---

# 15. Accessibility

Production frontend implementation will include:

- keyboard navigation
- focus management
- semantic HTML
- accessible controls
- appropriate labels
- usable contrast
- reduced-motion considerations
- screen-reader-friendly interaction where applicable

Accessibility will be verified as features are implemented.

---

# 16. Performance

Frontend performance requirements include:

- efficient rendering
- controlled DOM updates
- optimized media loading
- lazy loading where appropriate
- minimized unnecessary network requests
- appropriate asset handling
- responsive interaction
- production build verification

Performance optimization must not prematurely complicate the architecture.

---

# 17. Authentication UI

Production authentication will eventually include:

- registration
- login
- logout
- session handling
- protected routes/views
- account state
- authorization-aware UI
- secure error handling

Authentication UI must integrate with backend authentication rather than implementing security independently in the browser.

---

# 18. Admin Frontend

A production admin interface will eventually support:

- dashboard
- movie catalogue management
- draft/review/publish workflow
- unpublish/take-down controls
- media-processing status
- synchronization status
- job status
- audit visibility
- user/account administration where appropriate

Admin-only functionality must be protected by backend authorization.

---

# 19. Notifications

The frontend will eventually consume notification events from the backend.

Possible notification types include:

- account events
- playback events
- system events
- payment events
- administrative events

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

- application startup
- movie catalogue loading
- movie selection
- Mini Theatre playback
- trailer playback
- playlist creation
- adding/removing movies
- playback progress
- authentication
- registration
- protected functionality
- admin workflows
- payment workflows
- notification workflows

Tests should verify real user behavior rather than implementation details.

---

# 22. Production Verification

Every meaningful frontend milestone must be verified.

Verification may include:

- development server
- production build
- browser testing
- responsive testing
- media testing
- API integration testing
- Playwright E2E testing
- regression testing

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
'@ | Set-Content ".\docs\STREAMFLIX-FRONTEND-DEVELOPER-JOURNAL.md" -Encoding UTF8