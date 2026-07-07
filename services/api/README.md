# Forge API

FastAPI service for Forge course persistence, media, publish jobs, sessions, comments, and collaboration.

This service targets Python 3.12 and Cloud Run behind the Okta gateway. The current Phase 1 code is a local FastAPI skeleton with header-based identity extraction, in-memory course storage, per-lesson writes, per-user sessions, and a fake media upload signer.

## Local Setup

From the workspace root, prefer the shared `.venv` when it exists:

```sh
.venv/bin/python -m pip install -e "services/api[dev]"
.venv/bin/python -m uvicorn forge_api.main:app --app-dir services/api/src --reload
```

If the workspace `.venv` does not exist, create it with Python 3.12 first:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -e "services/api[dev]"
```

The local server defaults to `http://127.0.0.1:8000`. FastAPI also serves:

- `GET /docs`
- `GET /openapi.json`

## Local Auth Stub

Local requests simulate the Okta gateway by sending forwarded identity headers:

```sh
curl \
  -H "X-Okta-Subject: 00u-local-author" \
  -H "X-Forwarded-Email: author@example.com" \
  -H "X-Forwarded-Name: Ada Author" \
  http://127.0.0.1:8000/me
```

`GET /healthz` is intentionally public. All other implemented Forge endpoints require a subject header.

## Tests

Run the API tests from the workspace root:

```sh
.venv/bin/python -m pytest services/api
```

## Implemented Endpoints

- `GET /healthz`: unauthenticated health check.
- `GET /me`: returns identity from forwarded gateway headers.
- `GET /courses`: lists courses owned by the authenticated subject.
- `POST /courses`: creates a course document at revision 1.
- `GET /courses/{course_id}`: returns a course document and revision.
- `PATCH /courses/{course_id}`: shallow patches a course after revision check.
- `DELETE /courses/{course_id}?revision={revision}`: deletes a course after revision check.
- `GET /courses/{course_id}/lessons/{lesson_id}`: returns one lesson.
- `PUT /courses/{course_id}/lessons/{lesson_id}`: replaces or appends one lesson after revision check.
- `GET /courses/{course_id}/session`: returns the authenticated user's editing session for the course.
- `PUT /courses/{course_id}/session`: stores the authenticated user's editing session for the course.
- `POST /media/uploads`: returns a fake signed upload URL shape after MIME, size, and optional SHA-256 validation.

## Current Limitations And Stubs

- Persistence is in memory only. Data is lost when the process exits.
- Postgres, SQLAlchemy models, Alembic migrations, and Cloud SQL wiring are not implemented yet.
- Auth trusts local forwarded headers. It does not verify Okta tokens or gateway signatures.
- Role checks are not implemented. Direct course read and write endpoints do not yet enforce Owner, Editor, or Reviewer access.
- Course validation is a stub. It only checks that `lessons` is an array, not the shared schema package.
- Media upload signing is a local fake. There is no GCS signed URL, uploaded-object verification, hash dedupe, or derived asset worker yet.
- `GET /courses/{id}/events` SSE, polling event feed, lesson locks, comments, duplicate, versions, packages, publish jobs, shared blocks, audit logs, and rate limits are not implemented yet.
- WebSocket passthrough through the Okta and Cloud Run gateway is not locally verified. ADR 0001 selects SSE with polling fallback for Phase 1 and keeps WebSocket status pending until the deployed spike runs.
