# ADR 0001: Gateway SSE and WebSocket Transport Defaults

## Status

Accepted for Phase 1 defaults. Deployed Okta and Cloud Run gateway evidence is pending.

## Context

SPEC 4.6 requires Tier 1 collaboration to use REST plus server-sent events for
presence, lesson locks, saves, and comments. SPEC 8 places the FastAPI service
on Cloud Run behind the Okta gateway. SPEC open question 13.6 asks whether that
gateway passes SSE streams and WebSocket upgrades.

The real spike cannot be executed from this local workspace. The behavior that
matters depends on a deployed Cloud Run revision, the Okta gateway route, browser
credentials from the internal Static Sites origin, proxy buffering, timeout
policy, and upgrade handling. Local FastAPI tests and direct localhost probes can
verify application code, but they cannot prove gateway passthrough.

## Decision

Phase 1 resolves SPEC open question 13.6 for now by choosing SSE as the preferred
Tier 1 presence transport, with 15 second polling as the fallback. The
`PresenceTransport` client abstraction must treat `GET /courses/{id}/events` as
the canonical event feed and hide whether it is carried by EventSource or polling.
The event representation must therefore remain polling-compatible.

WebSocket support remains pending until the deployed spike verifies the Okta
gateway upgrade path. Tier 2 co-editing may keep the Yjs document model and
round-trip constraints, but it must not require y-websocket as the only transport
until gateway evidence exists. The fallback for Tier 2 is Yjs-over-SSE/POST:
server-to-client Yjs updates over authenticated SSE and client-to-server updates
over authenticated POST.

Until the deployed spike is verified, implementation choices are:

- Tier 1 default: SSE.
- Tier 1 fallback: 15 second polling of the same event feed.
- Tier 2 WebSocket status: pending.
- Tier 2 fallback: Yjs-over-SSE/POST.

## Deployed Spike Procedure

Run this procedure in the deployed environment, not from the local workspace.

1. Deploy a scratch Cloud Run service from the same API runtime family and behind
   the same Okta gateway pattern planned for Forge.
2. Expose these probe endpoints:
   - `GET /probe/health`: returns build id and confirms identity header presence
     without logging PII.
   - `GET /probe/sse`: returns `text/event-stream`, emits a numbered event every
     second for at least 120 seconds, sends heartbeat comments, supports
     `Last-Event-ID`, and disables response caching.
   - `GET /probe/events`: returns the current event cursor as JSON for polling
     comparison.
   - `GET /probe/ws`: WebSocket echo endpoint with numbered messages and
     ping/pong.
   - `POST /probe/yjs-updates`: accepts an opaque binary or base64 Yjs update and
     echoes the accepted sequence id for fallback validation.
3. Test the service directly through Cloud Run if that path is available, then
   test the Okta gateway URL from a browser logged in through the same identity
   path as Static Sites.
4. From a page served on the internal Static Sites origin, open an `EventSource`
   to the gateway `GET /probe/sse` URL with credentials enabled by normal browser
   auth. Record event arrival timestamps for at least 120 seconds.
5. Repeat the SSE test with a dropped connection and `Last-Event-ID` reconnect.
   Confirm the service receives the identity headers and the client resumes from
   the next event id.
6. Open a browser `WebSocket` to the gateway `GET /probe/ws` URL. Record whether
   the upgrade reaches the app, whether the browser reports an open socket,
   whether echo and ping/pong messages work, and whether reconnect after a close
   restores the stream.
7. If the browser test is inconclusive, repeat with a CLI that can use the same
   authenticated gateway session or a short-lived test token approved for the
   gateway.
8. File the measured result back into this ADR with the Cloud Run revision,
   gateway URL, timestamp, probe commit, browser version, command output, event
   timing summary, and Cloud Run log excerpts.

## Expected Evidence

SSE passes when all of these are true:

- The gateway response is `text/event-stream`.
- The first event arrives within 2 seconds after auth completes.
- Events arrive incrementally without proxy buffering for at least 120 seconds.
- Heartbeats are not stripped.
- `Last-Event-ID` reconnect resumes without duplicating or skipping events.
- Okta identity headers reach the Cloud Run app.
- The Static Sites origin can open the stream without a CORS or credential issue.

SSE fails if the gateway buffers the stream, strips heartbeats, closes the stream
before the test window without reconnect recovery, blocks credentials, or prevents
the app from seeing identity headers. If SSE fails, Phase 1 uses polling by
default.

WebSocket passes when the gateway forwards the upgrade to the app, the browser
opens the socket, echo and ping/pong messages work, identity reaches the app, and
reconnect can restore state after a close. WebSocket remains usable only as an
optional Tier 2 transport until the result is recorded.

WebSocket fails if the gateway returns a non-upgrade HTTP response, closes the
socket before app code handles it, strips identity, or requires a route shape that
Forge cannot use. If WebSocket fails or remains unverified, Tier 2 uses
Yjs-over-SSE/POST.

## Consequences

The Phase 1 API and editor can proceed with a low-risk collaboration contract:
REST writes, SSE-preferred presence events, and polling fallback. The deployed
spike still must be run before any milestone commits to y-websocket as the live
co-editing transport.
