from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

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
        self, course_id: str, lesson_id: str, revision: int, lesson: dict[str, Any]
    ) -> RevisionedCourse:
        raise NotImplementedError

    def get_session(self, course_id: str, user_subject: str) -> SessionRecord:
        raise NotImplementedError

    def put_session(
        self, course_id: str, user_subject: str, data: SessionDoc
    ) -> SessionRecord:
        raise NotImplementedError


@dataclass
class _StoredCourse:
    revision: int
    data: CourseDoc
    owner_subject: str


class InMemoryCourseRepository:
    """Local repository boundary that can be replaced by SQLAlchemy later."""

    def __init__(self) -> None:
        self._courses: dict[str, _StoredCourse] = {}
        self._sessions: dict[tuple[str, str], SessionRecord] = {}

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

    def get_lesson(self, course_id: str, lesson_id: str) -> dict[str, Any]:
        stored = self._require_course(course_id)
        return deepcopy(_find_lesson(stored.data, lesson_id))

    def put_lesson(
        self, course_id: str, lesson_id: str, revision: int, lesson: dict[str, Any]
    ) -> RevisionedCourse:
        stored = self._require_course(course_id)
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
            updated_at=_now_iso(),
        )
        self._sessions[(course_id, user_subject)] = record
        return record

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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
