# StreamFlix Developer Journal

## Purpose

This document is the production engineering reference for StreamFlix.

It records:

* architecture decisions
* implementation milestones
* database/schema changes
* synchronization rules
* resiliency decisions
* worker and event architecture
* security decisions
* testing and verification
* failures and fixes
* repository and deployment milestones
* production-readiness milestones

The journal must remain up to date as implementation progresses.

---

# Production Architecture — Locked Decisions

## 1. Application Architecture

StreamFlix will use a production-oriented modular monolith backend.

MongoDB is the source of truth.

Redis will be used as a cache and must remain disposable. StreamFlix must remain recoverable from MongoDB if Redis is unavailable.

RabbitMQ will provide durable asynchronous messaging.

Dedicated workers will process background operations.

---

## 2. Media Architecture

Authorized media source

→ upload

→ temporary processing

→ FFmpeg

→ HLS multi-bitrate output

→ object storage

→ CDN

→ StreamFlix player

MongoDB stores media metadata and references, not large video files.

TMDB provides metadata only. TMDB is not a source of full movie files for StreamFlix.

---

## 3. TMDB Data Ownership

StreamFlix-owned catalogue data must not be destructively overwritten by TMDB synchronization.

`Movie.genres` is StreamFlix-owned.

TMDB genre names are stored separately under:

`external.tmdbGenres`

TMDB metadata may update TMDB-owned fields while preserving StreamFlix-owned fields.

---

## 4. Data Fallback & Resiliency

External service failure must not make the StreamFlix catalogue unusable.

The system must:

* preserve trusted existing data
* handle external API failures safely
* use controlled retries
* use cache/fallback strategies
* avoid destructive updates caused by incomplete external responses

---

## 5. Synchronization Integrity

Synchronization must be:

* controlled
* idempotent
* ownership-aware
* recoverable
* observable

External metadata must not silently overwrite application-controlled data.

---

## 6. Admin Control

Production administration will include:

* authentication
* RBAC
* controlled catalogue management
* draft/review/publish workflow
* unpublish/take-down controls
* audit logging
* controlled external synchronization

---

## 7. Webhook / Automation Triggers

Important domain events will be capable of triggering asynchronous operations.

Examples:

* MoviePublished
* MovieUnpublished
* MovieUpdated
* MediaProcessingStarted
* MediaProcessingCompleted
* MediaProcessingFailed
* Payment events
* Notification events
* Cache invalidation events

Events must be designed for safe repeated delivery.

---

## 8. Unpublish / Take-Down Loop

Published content must be capable of being removed from public availability without destroying its underlying record.

Conceptual lifecycle:

Draft

→ Review

→ Published

→ Unpublished / Taken Down

→ Archived

Take-down operations must propagate to:

* public catalogue visibility
* playback authorization
* cache
* events
* audit records

---

## 9. Cache Invalidation

MongoDB remains the source of truth.

Redis is an acceleration layer.

Catalogue mutations must trigger appropriate cache invalidation.

Cache failures must be retryable and must not corrupt MongoDB state.

---

# 10. Asynchronous Job Reliability & Worker State Synchronization

Workers must communicate their processing state back to MongoDB.

Every important asynchronous operation must have a durable job identity and lifecycle.

Required capabilities:

* durable job records
* worker → MongoDB state synchronization
* job state machines
* RabbitMQ manual acknowledgements
* retries
* exponential backoff
* dead-letter queues
* idempotent job processing
* correlation IDs
* transactional outbox
* worker inbox/idempotency protection
* stale-job detection
* reconciliation workers
* failure/error recording
* cache invalidation confirmation/retry
* media-processing state synchronization
* admin visibility into job state

A worker must not acknowledge a RabbitMQ message before the required processing/state persistence has been safely completed.

---

# Implementation Journal

## 2026-09-10 — TMDB Genre Separation

### Decision

TMDB genres and StreamFlix curated genres are separate data domains.

### Implementation

Added `external.tmdbGenres` to the Movie schema.

Updated the TMDB movie importer so:

* TMDB genres are stored in `external.tmdbGenres`
* StreamFlix `genres` are preserved
* newly imported movies receive an empty StreamFlix `genres` array

### Verification

Movie ID `2` / TMDB ID `820609` was re-imported successfully.

Verified:

StreamFlix genres:

* Sci-Fi
* Horror
* Mystery

TMDB genres:

* Horror
* Science Fiction

Result: synchronization preserved StreamFlix-owned genres while updating TMDB-owned genres.

---

## 2026-09-10 — Job Reliability Architecture Locked

### Decision

The asynchronous worker architecture requires a durable return path from workers back to MongoDB.

Workers must not be treated as fire-and-forget processes.

The production system will track asynchronous operations through durable Job records.

### Required State Lifecycle

`queued`

→ `processing`

→ `completed`

Failure path:

`processing`

→ `failed`

→ `retrying`

→ `processing`

Permanent failure:

`failed`

→ `dead-lettered`

### Reliability Requirements

Workers must support:

* retries
* idempotency
* RabbitMQ acknowledgements
* durable job state
* error recording
* correlation IDs
* reconciliation
* state recovery after worker crashes

### Additional Architecture

Transactional Outbox and worker Inbox/idempotency protection are locked for later implementation.

---

## 2026-09-10 — Job Model Implementation

### File

`backend/src/models/Job.js`

### Purpose

The Job model provides the MongoDB foundation for asynchronous processing.

### Initial Capabilities

* unique `jobId`
* job `type`
* lifecycle `status`
* entity association
* attempt tracking
* maximum retry attempts
* retry scheduling
* processing timestamps
* failure information
* correlation ID
* worker identity
* extensible metadata

### Verification

**Test:**

Job model verification command executed successfully.

**Result:**

* Job model loaded successfully
* MongoDB collection: `jobs`
* Supported states:

  * queued
  * processing
  * completed
  * failed
  * retrying
  * dead-lettered

**Status:** PASS

---

# 2026-09-11 — Repository History Reconciliation

## Objective

The StreamFlix repository was audited and reconciled after discovering that the local `main` branch and GitHub `main` branch contained divergent histories.

The objective was to establish a clean authoritative `main` history while preserving the working application and maintaining recoverable copies of the previous histories.

---

## Repository Structure Investigation

Multiple nested Git repositories were discovered inside the StreamFlix project.

The outer StreamFlix repository was established as the authoritative repository.

An obsolete nested repository and stale Gitlink were removed from the active project structure.

The obsolete nested project was archived before removal.

A complete filesystem backup was created before the repository restructuring.

---

## Git Safety Branches

A local safety branch was created:

`safety/before-history-reconcile-2026-09-11`

A second safety branch preserving the previous GitHub `main` history was created:

`safety/remote-main-before-reconcile`

These branches remain intentionally preserved for recovery and historical comparison.

---

## Duplicate History Investigation

The local and remote histories contained multiple commits representing identical project snapshots under different commit identities.

Verified equivalent commit pairs included:

* `c9fd44d` ↔ `66421bc`
* `2954fe7` ↔ `1b6cb9d`
* `d346863` ↔ `5bf9ae0`

Tree comparisons showed that the corresponding snapshots contained no file differences.

The current local project state was therefore treated as the authoritative development state instead of blindly merging the duplicate remote history.

---

## Large Media History Cleanup

Large video files had previously entered Git history.

The affected media existed under multiple historical paths, including:

`assets/videos/movies/`

`assets/videos/trailers/`

`src/data/hero/movies/`

The affected development videos included:

* Blood Sisters
* Gotham
* No One Will Save You

The large video files were removed from the reachable `main` history using `git-filter-repo`.

The physical local development media was intentionally preserved.

This establishes the following separation:

**Git repository:** source code and appropriate project assets

**Local development environment:** local media files may remain available

**Production media:** will eventually use object storage, CDN, FFmpeg/HLS processing and the planned production media pipeline

---

## Media Tracking Verification

After the history rewrite, the reachable `main` history was checked for common video extensions:

* `.mp4`
* `.mkv`
* `.webm`
* `.mov`
* `.avi`

The verification returned no matching video objects.

This confirmed that the large development videos were no longer reachable from the cleaned `main` history.

---

## Backend Configuration Cleanup

During repository investigation, two configuration locations were discovered:

`backend/config/config.js`

`backend/src/config/config.js`

Application imports confirmed that the active configuration was:

`backend/src/config/config.js`

The obsolete `backend/config/config.js` was removed from the repository.

The active configuration architecture was preserved.

---

## Backend Media References

Existing backend media references were intentionally preserved.

Current application-facing storage areas include:

* `backend/storage/videos/`
* `backend/storage/trailers/`
* `backend/storage/poster/`
* `backend/storage/logos/`

These were not aggressively refactored during repository reconciliation.

Repository cleanup and application media architecture are treated as separate engineering tasks.

The eventual production media architecture remains the locked object-storage/CDN/HLS design described above.

---

## Application Verification

After the repository history rewrite, the StreamFlix application was launched and confirmed to load normally.

Verification confirmed that the repository cleanup did not break the running application.

### Verification

**Test:**

* Start StreamFlix application.
* Verify frontend/backend operation.
* Confirm application loads after Git history rewrite.
* Confirm local development media remains available.
* Verify Git working tree.
* Verify local and remote branch synchronization.
* Search cleaned `main` history for large video files.

**Expected:**

* Application loads normally.
* Existing local development media remains usable.
* Working tree is clean.
* Local `main` and GitHub `origin/main` point to the same commit.
* No large video files remain reachable from `main` history.

**Result:**

All verification checks passed.

**Status:** PASS

---

## Final Git State

The final cleaned `main` commit is:

`a690bdabd6733d559e45778301764f2eaf29f8d3`

Commit message:

`chore: reconcile StreamFlix repository history`

The cleaned history was pushed to GitHub using:

`git push --force-with-lease origin main`

The first push operation successfully updated GitHub with a forced update from the previous remote commit to the cleaned commit.

A subsequent fetch confirmed synchronization.

### Final Verification

Local `main`:

`a690bdabd6733d559e45778301764f2eaf29f8d3`

Remote `origin/main`:

`a690bdabd6733d559e45778301764f2eaf29f8d3`

Git status:

`Your branch is up to date with 'origin/main'.`

`nothing to commit, working tree clean`

---

## Repository Reconciliation Result

**Status: COMPLETE**

The StreamFlix repository is now synchronized with GitHub.

The cleaned `main` history no longer contains the large historical development video files.

Safety branches remain preserved.

The application continues to load normally after the repository changes.

---

# Production Verification Log

Verification must be added here after every meaningful implementation milestone.

Format:

### Date

**Change:**

**Test:**

**Expected:**

**Result:**

**Status:** PASS / FAIL

**Notes:**

---

## 2026-09-10 — TMDB Genre Separation Verification

**Change:**

Separated TMDB-owned genres from StreamFlix-owned curated genres.

**Test:**

Re-imported Movie ID `2` / TMDB ID `820609`.

**Expected:**

TMDB genre data updates `external.tmdbGenres` without overwriting StreamFlix-owned `genres`.

**Result:**

StreamFlix genres remained:

* Sci-Fi
* Horror
* Mystery

TMDB genres were stored separately:

* Horror
* Science Fiction

**Status:** PASS

---

## 2026-09-10 — Job Model Verification

**Change:**

Implemented the initial asynchronous Job model.

**Test:**

Loaded and verified `backend/src/models/Job.js`.

**Expected:**

Job model loads correctly and exposes the required asynchronous lifecycle states.

**Result:**

MongoDB collection `jobs` verified.

Supported states:

* queued
* processing
* completed
* failed
* retrying
* dead-lettered

**Status:** PASS

---

## 2026-09-11 — Repository Reconciliation Verification

**Change:**

Reconciled divergent Git histories, removed large historical video blobs from reachable `main` history, preserved local development media, removed the obsolete configuration file, and synchronized the cleaned repository with GitHub.

**Test:**

* Audited repository structure.
* Created filesystem backup.
* Created Git safety branches.
* Compared duplicate local/remote commit trees.
* Removed stale nested repository.
* Removed large historical video files using `git-filter-repo`.
* Verified no common video extensions remained reachable from `main`.
* Launched the StreamFlix application.
* Fetched GitHub.
* Compared `main` and `origin/main`.
* Checked Git working tree.

**Expected:**

* Application continues to load normally.
* Local development media remains available.
* Large video files are no longer reachable from `main`.
* Local and remote `main` are synchronized.
* Working tree is clean.
* Safety branches remain available.

**Result:**

All checks passed.

**Status:** PASS

**Notes:**

Repository cleanup was completed without breaking the running StreamFlix application.

Large media is now separated from Git history while remaining available for local development.

Production media will eventually use the dedicated media architecture defined in the locked production architecture.

---

# Change Control Rules

1. Do not remove locked architecture decisions without explicitly revisiting the decision.
2. Do not introduce destructive external-data synchronization.
3. MongoDB remains the source of truth.
4. Redis must remain recoverable/disposable.
5. Asynchronous jobs must be observable and recoverable.
6. Worker failures must be represented in durable state.
7. Production features must be implemented incrementally and verified.
8. Playwright E2E coverage will be added around critical production workflows.
9. Security, observability, retries, failure handling, and recovery are production requirements, not optional polish.
10. Repository history changes must be preceded by appropriate backups and safety branches.
11. Large binary media must not be committed to the production Git repository.
12. Local development media and production media must be treated as separate concerns.
13. Configuration duplication must be resolved deliberately and active configuration paths must remain authoritative.
14. Repository cleanup must not be used as a substitute for application architecture changes.
15. Every meaningful repository or backend implementation change must be verified and documented.
16. Production deployment must be performed only after the deployed environment has been explicitly verified.
