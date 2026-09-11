# StreamFlix Developer Journal

## Purpose

This document is the production engineering reference for StreamFlix.

It records:
- architecture decisions
- implementation milestones
- database/schema changes
- synchronization rules
- resiliency decisions
- worker and event architecture
- security decisions
- testing and verification
- failures and fixes
- production-readiness milestones

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
- preserve trusted existing data
- handle external API failures safely
- use controlled retries
- use cache/fallback strategies
- avoid destructive updates caused by incomplete external responses

---

## 5. Synchronization Integrity

Synchronization must be:
- controlled
- idempotent
- ownership-aware
- recoverable
- observable

External metadata must not silently overwrite application-controlled data.

---

## 6. Admin Control

Production administration will include:
- authentication
- RBAC
- controlled catalogue management
- draft/review/publish workflow
- unpublish/take-down controls
- audit logging
- controlled external synchronization

---

## 7. Webhook / Automation Triggers

Important domain events will be capable of triggering asynchronous operations.

Examples:
- MoviePublished
- MovieUnpublished
- MovieUpdated
- MediaProcessingStarted
- MediaProcessingCompleted
- MediaProcessingFailed
- Payment events
- Notification events
- Cache invalidation events

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
- public catalogue visibility
- playback authorization
- cache
- events
- audit records

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

- durable job records
- worker → MongoDB state synchronization
- job state machines
- RabbitMQ manual acknowledgements
- retries
- exponential backoff
- dead-letter queues
- idempotent job processing
- correlation IDs
- transactional outbox
- worker inbox/idempotency protection
- stale-job detection
- reconciliation workers
- failure/error recording
- cache invalidation confirmation/retry
- media-processing state synchronization
- admin visibility into job state

A worker must not acknowledge a RabbitMQ message before the required processing/state persistence has been safely completed.

---

# Implementation Journal

## 2026-09-10 — TMDB Genre Separation

### Decision

TMDB genres and StreamFlix curated genres are separate data domains.

### Implementation

Added `external.tmdbGenres` to the Movie schema.

Updated the TMDB movie importer so:

- TMDB genres are stored in `external.tmdbGenres`
- StreamFlix `genres` are preserved
- newly imported movies receive an empty StreamFlix `genres` array

### Verification

Movie ID `2` / TMDB ID `820609` was re-imported successfully.

Verified:

StreamFlix genres:
- Sci-Fi
- Horror
- Mystery

TMDB genres:
- Horror
- Science Fiction

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
- retries
- idempotency
- RabbitMQ acknowledgements
- durable job state
- error recording
- correlation IDs
- reconciliation
- state recovery after worker crashes

### Additional Architecture

Transactional Outbox and worker Inbox/idempotency protection are locked for later implementation.

---

## 2026-09-10 — Job Model Implementation

### File

`backend/src/models/Job.js`

### Purpose

The Job model provides the MongoDB foundation for asynchronous processing.

### Initial Capabilities

- unique `jobId`
- job `type`
- lifecycle `status`
- entity association
- attempt tracking
- maximum retry attempts
- retry scheduling
- processing timestamps
- failure information
- correlation ID
- worker identity
- extensible metadata

### Verification

**Test:**

Job model verification command executed successfully.

**Result:**

- Job model loaded successfully
- MongoDB collection: `jobs`
- Supported states:
  - queued
  - processing
  - completed
  - failed
  - retrying
  - dead-lettered

**Status:** PASS

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
