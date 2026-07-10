from fastapi.testclient import TestClient

from forge_api.main import create_app


def auth_headers(subject: str = "00u123", email: str = "author@example.com") -> dict[str, str]:
    return {
        "X-Okta-Subject": subject,
        "X-Forwarded-Email": email,
        "X-Forwarded-Name": "Ada Author",
    }


def minimal_course(course_id: str = "course_1") -> dict:
    return {
        "schemaVersion": "1.0.0",
        "id": course_id,
        "title": "Safety basics",
        "description": "A short launch course",
        "defaultLocale": "en-US",
        "theme": {},
        "labelSet": {},
        "settings": {},
        "lessons": [
            {
                "type": "blocks",
                "id": "lesson_1",
                "title": "Welcome",
                "blocks": [],
            }
        ],
        "media": {},
        "createdAt": "2026-07-04T00:00:00Z",
        "updatedAt": "2026-07-04T00:00:00Z",
    }


def test_healthz_does_not_require_auth() -> None:
    client = TestClient(create_app())

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_me_extracts_okta_forwarded_headers() -> None:
    client = TestClient(create_app())

    response = client.get("/me", headers=auth_headers())

    assert response.status_code == 200
    assert response.json() == {
        "subject": "00u123",
        "email": "author@example.com",
        "displayName": "Ada Author",
    }


def test_me_rejects_missing_identity_headers() -> None:
    client = TestClient(create_app())

    response = client.get("/me")

    assert response.status_code == 401
    assert response.json()["code"] == "missing_identity"


def test_course_create_read_update_and_revision_conflict() -> None:
    client = TestClient(create_app())

    create_response = client.post(
        "/courses",
        json={"data": minimal_course()},
        headers=auth_headers(),
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["revision"] == 1
    assert created["data"]["title"] == "Safety basics"

    read_response = client.get("/courses/course_1", headers=auth_headers())

    assert read_response.status_code == 200
    assert read_response.json()["revision"] == 1

    conflict_response = client.patch(
        "/courses/course_1",
        json={"revision": 99, "data": {"title": "Conflicting title"}},
        headers=auth_headers(),
    )

    assert conflict_response.status_code == 409
    assert conflict_response.json()["code"] == "revision_conflict"
    assert conflict_response.json()["details"] == {
        "serverRevision": 1,
        "clientRevision": 99,
    }

    update_response = client.patch(
        "/courses/course_1",
        json={"revision": 1, "data": {"title": "Updated title"}},
        headers=auth_headers(),
    )

    assert update_response.status_code == 200
    assert update_response.json()["revision"] == 2
    assert update_response.json()["data"]["title"] == "Updated title"


def test_put_lesson_updates_single_lesson_and_bumps_revision() -> None:
    client = TestClient(create_app())
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())
    lock_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(),
    )

    lesson = {
        "type": "blocks",
        "id": "lesson_1",
        "title": "Reworked welcome",
        "blocks": [
            {
                "id": "block_1",
                "family": "text",
                "variant": "paragraph",
                "payload": {"html": "<p>Hello</p>"},
                "settings": {},
            }
        ],
    }
    response = client.put(
        "/courses/course_1/lessons/lesson_1",
        json={"revision": 1, "lockToken": lock_response.json()["token"], "data": lesson},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["revision"] == 2
    assert body["data"]["lessons"][0] == lesson


def test_lesson_lock_acquire_renew_release_and_reacquire() -> None:
    client = TestClient(create_app())
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())

    acquire_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u111", email="holder@example.com"),
    )

    assert acquire_response.status_code == 200
    acquired = acquire_response.json()
    assert acquired["lessonId"] == "lesson_1"
    assert acquired["token"]
    assert acquired["holder"] == {
        "subject": "00u111",
        "email": "holder@example.com",
        "displayName": "Ada Author",
    }
    assert acquired["expiresAt"] > acquired["serverTime"]

    blocked_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u222", email="other@example.com"),
    )

    assert blocked_response.status_code == 423
    assert blocked_response.json()["code"] == "lesson_locked"
    assert blocked_response.json()["details"]["holder"]["subject"] == "00u111"

    renew_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        json={"token": acquired["token"]},
        headers=auth_headers(subject="00u111", email="holder@example.com"),
    )

    assert renew_response.status_code == 200
    assert renew_response.json()["token"] == acquired["token"]
    assert renew_response.json()["expiresAt"] >= acquired["expiresAt"]

    release_response = client.request(
        "DELETE",
        "/courses/course_1/lessons/lesson_1/lock",
        json={"token": acquired["token"]},
        headers=auth_headers(subject="00u111", email="holder@example.com"),
    )

    assert release_response.status_code == 204

    reacquire_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u222", email="other@example.com"),
    )

    assert reacquire_response.status_code == 200
    assert reacquire_response.json()["holder"]["subject"] == "00u222"


def test_lesson_lock_expires_and_allows_new_holder() -> None:
    from datetime import datetime, timedelta, timezone

    from forge_api.repository import InMemoryCourseRepository

    now = datetime(2026, 7, 9, 12, 0, tzinfo=timezone.utc)
    repo = InMemoryCourseRepository(clock=lambda: now)
    client = TestClient(create_app(repository=repo))
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())

    first_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u111"),
    )

    assert first_response.status_code == 200

    repo.set_clock(lambda: now + timedelta(seconds=61))
    second_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u222"),
    )

    assert second_response.status_code == 200
    assert second_response.json()["holder"]["subject"] == "00u222"


def test_put_lesson_rejects_missing_stale_and_other_user_lock_tokens() -> None:
    client = TestClient(create_app())
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())
    lock_response = client.post(
        "/courses/course_1/lessons/lesson_1/lock",
        headers=auth_headers(subject="00u111"),
    )
    token = lock_response.json()["token"]

    missing_response = client.put(
        "/courses/course_1/lessons/lesson_1",
        json={"revision": 1, "data": {"type": "blocks", "id": "lesson_1", "title": "Nope"}},
        headers=auth_headers(subject="00u111"),
    )

    assert missing_response.status_code == 423
    assert missing_response.json()["code"] == "lesson_lock_required"

    stale_response = client.put(
        "/courses/course_1/lessons/lesson_1",
        json={
            "revision": 1,
            "lockToken": "stale-token",
            "data": {"type": "blocks", "id": "lesson_1", "title": "Nope"},
        },
        headers=auth_headers(subject="00u111"),
    )

    assert stale_response.status_code == 423
    assert stale_response.json()["code"] == "lesson_lock_stale"

    other_user_response = client.put(
        "/courses/course_1/lessons/lesson_1",
        json={
            "revision": 1,
            "lockToken": token,
            "data": {"type": "blocks", "id": "lesson_1", "title": "Nope"},
        },
        headers=auth_headers(subject="00u222"),
    )

    assert other_user_response.status_code == 423
    assert other_user_response.json()["code"] == "lesson_lock_stale"


def test_session_put_then_get_resumes_for_authenticated_user() -> None:
    client = TestClient(create_app())
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())

    session_payload = {
        "lastOpenLessonId": "lesson_1",
        "scrollAnchor": "block_1",
        "selectedBlockId": "block_1",
        "panelState": {"open": True, "tab": "settings"},
    }
    put_response = client.put(
        "/courses/course_1/session",
        json={"data": session_payload},
        headers=auth_headers(subject="00u999", email="resume@example.com"),
    )

    assert put_response.status_code == 200
    assert put_response.json()["data"] == session_payload
    assert put_response.json()["heartbeat"] == {
        "status": "active",
        "intervalSeconds": 10,
        "staleAfterSeconds": 30,
    }

    get_response = client.get(
        "/courses/course_1/session",
        headers=auth_headers(subject="00u999", email="resume@example.com"),
    )

    assert get_response.status_code == 200
    assert get_response.json()["data"] == session_payload
    assert get_response.json()["userSubject"] == "00u999"
    assert get_response.json()["serverTime"] >= get_response.json()["updatedAt"]


def test_session_is_private_to_authenticated_user() -> None:
    client = TestClient(create_app())
    client.post("/courses", json={"data": minimal_course()}, headers=auth_headers())

    client.put(
        "/courses/course_1/session",
        json={"data": {"lastOpenLessonId": "lesson_1", "selectedBlockId": "private"}},
        headers=auth_headers(subject="00u999"),
    )

    other_response = client.get(
        "/courses/course_1/session",
        headers=auth_headers(subject="00u123"),
    )

    assert other_response.status_code == 200
    assert other_response.json()["data"] == {}
    assert other_response.json()["userSubject"] == "00u123"


def test_media_upload_returns_fake_signed_url_shape() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/media/uploads",
        json={
            "kind": "image",
            "filename": "hero.png",
            "mime": "image/png",
            "bytes": 1024,
            "sha256": "a" * 64,
        },
        headers=auth_headers(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["mediaId"].startswith("media_")
    assert body["method"] == "PUT"
    assert body["uploadUrl"].startswith("http://local.forge/uploads/")
    assert body["headers"] == {"Content-Type": "image/png"}
    assert body["validation"] == {
        "status": "stubbed",
        "checks": ["mime", "size", "sha256", "post_upload_probe"],
    }


def test_media_upload_rejects_mime_that_does_not_match_kind() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/media/uploads",
        json={
            "kind": "image",
            "filename": "hero.txt",
            "mime": "text/plain",
            "bytes": 1024,
        },
        headers=auth_headers(),
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_upload"
    assert response.json()["details"]["field"] == "mime"


def test_openapi_generation_includes_phase_one_paths() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/healthz" in paths
    assert "/me" in paths
    assert "/courses" in paths
    assert "/courses/{course_id}/lessons/{lesson_id}" in paths
    assert "/courses/{course_id}/lessons/{lesson_id}/lock" in paths
    assert "/courses/{course_id}/session" in paths
    assert "/media/uploads" in paths
