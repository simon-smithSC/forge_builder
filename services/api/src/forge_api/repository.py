from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Protocol
from uuid import uuid4

from forge_api.auth import Identity
from forge_api.errors import ApiProblem


CourseDoc = dict[str, Any]
SessionDoc = dict[str, Any]


@dataclass(frozen=True)
class RevisionedCourse:
    revision: int
    data: CourseDoc


@dataclass(frozen=True)
class SessionRecord:
    course_id: str
    user_subject: str
    data: SessionDoc
    updated_at: str | None


@dataclass(frozen=True)
class LessonLock:
    lesson_id: str
    token: str
    holder: Identity
    expires_at: str
    server_time: str


class CourseRepository(Protocol):
    def list_courses(self, user_subject: str) -> list[RevisionedCourse]:
        raise NotImplementedError

    def create_course(self, data: CourseDoc, user_subject: str) -> RevisionedCourse:
        raise NotImplementedError

    def get_course(self, course_id: str) -> RevisionedCourse:
        raise NotImplementedError

    def patch_course(self, course_id: str, revision: int, patch: CourseDoc) -> RevisionedCourse:
        raise NotImplementedError

    def delete_course(self, course_id: str, revision: int) -> None:
        raise NotImplementedError

    def get_lesson(self, course_id: str, lesson_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def put_lesson(
        self,
        course_id: str,
        lesson_id: str,
        revision: int,
        lesson: dict[str, Any],
        lock_token: str | None,
        identity: Identity,
    ) -> RevisionedCourse:
        raise NotImplementedError

    def acquire_lesson_lock(
        self, course_id: str, lesson_id: str, identity: Identity, token: str | None = None
    ) -> LessonLock:
        raise NotImplementedError

    def release_lesson_lock(
        self, course_id: str, lesson_id: str, identity: Identity, token: str
    ) -> None:
        raise NotImplementedError

    def get_session(self, course_id: str, user_subject: str) -> SessionRecord:
        raise NotImplementedError

    def put_session(
        self, course_id: str, user_subject: str, data: SessionDoc
    ) -> SessionRecord:
        raise NotImplementedError

    def server_time(self) -> str:
        raise NotImplementedError


@dataclass
class _StoredCourse:
    revision: int
    data: CourseDoc
    owner_subject: str


@dataclass
class _StoredLessonLock:
    token: str
    holder: Identity
    expires_at: datetime


class InMemoryCourseRepository:
    """Local repository boundary that can be replaced by SQLAlchemy later."""

    def __init__(self, clock: Callable[[], datetime] | None = None) -> None:
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._courses: dict[str, _StoredCourse] = {}
        self._sessions: dict[tuple[str, str], SessionRecord] = {}
        self._lesson_locks: dict[tuple[str, str], _StoredLessonLock] = {}

    def set_clock(self, clock: Callable[[], datetime]) -> None:
        self._clock = clock

    def list_courses(self, user_subject: str) -> list[RevisionedCourse]:
        return [
            _revisioned(stored)
            for stored in self._courses.values()
            if stored.owner_subject == user_subject
        ]

    def create_course(self, data: CourseDoc, user_subject: str) -> RevisionedCourse:
        course = deepcopy(data)
        course_id = str(course.get("id") or f"course_{uuid4().hex}")
        course["id"] = course_id

        if course_id in self._courses:
            raise ApiProblem(
                status_code=409,
                code="course_exists",
                message=f"Course {course_id} already exists.",
            )

        _validate_course_stub(course)
        stored = _StoredCourse(revision=1, data=course, owner_subject=user_subject)
        self._courses[course_id] = stored
        return _revisioned(stored)

    def get_course(self, course_id: str) -> RevisionedCourse:
        return _revisioned(self._require_course(course_id))

    def patch_course(self, course_id: str, revision: int, patch: CourseDoc) -> RevisionedCourse:
        stored = self._require_course(course_id)
        _assert_revision(stored.revision, revision)
        updated = deepcopy(stored.data)
        updated.update(deepcopy(patch))
        updated["id"] = course_id
        _validate_course_stub(updated)
        stored.data = updated
        stored.revision += 1
        return _revisioned(stored)

    def delete_course(self, course_id: str, revision: int) -> None:
        stored = self._require_course(course_id)
        _assert_revision(stored.revision, revision)
        del self._courses[course_id]
        for key in list(self._sessions):
            if key[0] == course_id:
                del self._sessions[key]
        for key in list(self._lesson_locks):
            if key[0] == course_id:
                del self._lesson_locks[key]

    def get_lesson(self, course_id: str, lesson_id: str) -> dict[str, Any]:
        stored = self._require_course(course_id)
        return deepcopy(_find_lesson(stored.data, lesson_id))

    def put_lesson(
        self,
        course_id: str,
        lesson_id: str,
        revision: int,
        lesson: dict[str, Any],
        lock_token: str | None,
        identity: Identity,
    ) -> RevisionedCourse:
        stored = self._require_course(course_id)
        self._assert_lesson_lock(course_id, lesson_id, lock_token, identity)
        _assert_revision(stored.revision, revision)

        replacement = deepcopy(lesson)
        if replacement.get("id") not in (None, lesson_id):
            raise ApiProblem(
                status_code=400,
                code="invalid_lesson",
                message="Lesson id must match the path lesson id.",
                details={"field": "id"},
            )
        replacement["id"] = lesson_id

        lessons = deepcopy(stored.data.get("lessons", []))
        replaced = False
        for index, existing in enumerate(lessons):
            if isinstance(existing, dict) and existing.get("id") == lesson_id:
                lessons[index] = replacement
                replaced = True
                break
        if not replaced:
            lessons.append(replacement)

        updated = deepcopy(stored.data)
        updated["lessons"] = lessons
        _validate_course_stub(updated)
        stored.data = updated
        stored.revision += 1
        return _revisioned(stored)

    def acquire_lesson_lock(
        self, course_id: str, lesson_id: str, identity: Identity, token: str | None = None
    ) -> LessonLock:
        self._require_course(course_id)
        _find_lesson(self._courses[course_id].data, lesson_id)
        now = self._now()
        key = (course_id, lesson_id)
        existing = self._active_lock(key, now)

        if token is not None:
            if existing is None or existing.token != token or existing.holder.subject != identity.subject:
                raise _stale_lock_problem(existing)
            existing.expires_at = now + timedelta(seconds=60)
            return _lesson_lock_response(lesson_id, existing, now)

        if existing is not None:
            raise ApiProblem(
                status_code=423,
                code="lesson_locked",
                message="Lesson is locked by another active author.",
                details=_lock_details(lesson_id, existing, now),
            )

        created = _StoredLessonLock(
            token=f"lock_{uuid4().hex}",
            holder=identity,
            expires_at=now + timedelta(seconds=60),
        )
        self._lesson_locks[key] = created
        return _lesson_lock_response(lesson_id, created, now)

    def release_lesson_lock(
        self, course_id: str, lesson_id: str, identity: Identity, token: str
    ) -> None:
        self._require_course(course_id)
        _find_lesson(self._courses[course_id].data, lesson_id)
        key = (course_id, lesson_id)
        existing = self._active_lock(key, self._now())
        if existing is None:
            return
        if existing.token != token or existing.holder.subject != identity.subject:
            raise _stale_lock_problem(existing)
        del self._lesson_locks[key]

    def get_session(self, course_id: str, user_subject: str) -> SessionRecord:
        self._require_course(course_id)
        return self._sessions.get(
            (course_id, user_subject),
            SessionRecord(
                course_id=course_id,
                user_subject=user_subject,
                data={},
                updated_at=None,
            ),
        )

    def put_session(
        self, course_id: str, user_subject: str, data: SessionDoc
    ) -> SessionRecord:
        self._require_course(course_id)
        record = SessionRecord(
            course_id=course_id,
            user_subject=user_subject,
            data=deepcopy(data),
            updated_at=_isoformat(self._now()),
        )
        self._sessions[(course_id, user_subject)] = record
        return record

    def server_time(self) -> str:
        return _isoformat(self._now())

    def _assert_lesson_lock(
        self, course_id: str, lesson_id: str, token: str | None, identity: Identity
    ) -> None:
        existing = self._active_lock((course_id, lesson_id), self._now())
        if existing is None or token is None:
            raise ApiProblem(
                status_code=423,
                code="lesson_lock_required",
                message="Lesson writes require an active lesson lock token.",
            )
        if existing.token != token or existing.holder.subject != identity.subject:
            raise _stale_lock_problem(existing)

    def _active_lock(
        self, key: tuple[str, str], now: datetime
    ) -> _StoredLessonLock | None:
        existing = self._lesson_locks.get(key)
        if existing is None:
            return None
        if existing.expires_at <= now:
            del self._lesson_locks[key]
            return None
        return existing

    def _now(self) -> datetime:
        now = self._clock()
        if now.tzinfo is None:
            return now.replace(tzinfo=timezone.utc)
        return now.astimezone(timezone.utc)

    def _require_course(self, course_id: str) -> _StoredCourse:
        stored = self._courses.get(course_id)
        if stored is None:
            raise ApiProblem(
                status_code=404,
                code="course_not_found",
                message=f"Course {course_id} was not found.",
            )
        return stored


def _revisioned(stored: _StoredCourse) -> RevisionedCourse:
    return RevisionedCourse(revision=stored.revision, data=deepcopy(stored.data))


def _assert_revision(server_revision: int, client_revision: int) -> None:
    if server_revision != client_revision:
        raise ApiProblem(
            status_code=409,
            code="revision_conflict",
            message="Course revision did not match the server revision.",
            details={
                "serverRevision": server_revision,
                "clientRevision": client_revision,
            },
        )


def _find_lesson(course: CourseDoc, lesson_id: str) -> dict[str, Any]:
    for lesson in course.get("lessons", []):
        if isinstance(lesson, dict) and lesson.get("id") == lesson_id:
            return lesson
    raise ApiProblem(
        status_code=404,
        code="lesson_not_found",
        message=f"Lesson {lesson_id} was not found.",
    )


def _validate_course_stub(course: CourseDoc) -> None:
    if not isinstance(course.get("lessons", []), list):
        raise ApiProblem(
            status_code=400,
            code="invalid_course",
            message="Course lessons must be an array.",
            details={"field": "lessons"},
        )


def _lesson_lock_response(
    lesson_id: str, stored: _StoredLessonLock, server_time: datetime
) -> LessonLock:
    return LessonLock(
        lesson_id=lesson_id,
        token=stored.token,
        holder=stored.holder,
        expires_at=_isoformat(stored.expires_at),
        server_time=_isoformat(server_time),
    )


def _stale_lock_problem(existing: _StoredLessonLock | None) -> ApiProblem:
    return ApiProblem(
        status_code=423,
        code="lesson_lock_stale",
        message="Lesson lock token is missing, stale, or owned by another author.",
        details=None if existing is None else {"holder": _holder_details(existing.holder)},
    )


def _lock_details(
    lesson_id: str, stored: _StoredLessonLock, server_time: datetime
) -> dict[str, Any]:
    return {
        "lessonId": lesson_id,
        "holder": _holder_details(stored.holder),
        "expiresAt": _isoformat(stored.expires_at),
        "serverTime": _isoformat(server_time),
    }


def _holder_details(holder: Identity) -> dict[str, str | None]:
    return {
        "subject": holder.subject,
        "email": holder.email,
        "displayName": holder.display_name,
    }


def _isoformat(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
