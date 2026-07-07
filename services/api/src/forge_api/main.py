from __future__ import annotations

from fastapi import Depends, FastAPI, Request, Response, status

from forge_api.auth import Identity, get_identity
from forge_api.errors import ApiError, install_exception_handlers
from forge_api.repository import CourseRepository, InMemoryCourseRepository
from forge_api.schemas import (
    CourseCreateRequest,
    CourseListResponse,
    CoursePatchRequest,
    IdentityResponse,
    LessonPutRequest,
    MediaUploadRequest,
    MediaUploadResponse,
    RevisionedCourseResponse,
    SessionPutRequest,
    SessionResponse,
)
from forge_api.uploads import LocalUploadSigner


def create_app(repository: CourseRepository | None = None) -> FastAPI:
    app = FastAPI(
        title="Forge API",
        version="0.0.0",
        description="FastAPI service for Forge authoring, persistence, media, and publishing.",
    )
    app.state.repository = repository or InMemoryCourseRepository()
    app.state.upload_signer = LocalUploadSigner()
    install_exception_handlers(app)

    @app.get("/healthz", tags=["system"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(
        "/me",
        response_model=IdentityResponse,
        responses={401: {"model": ApiError}},
        tags=["identity"],
    )
    def me(identity: Identity = Depends(get_identity)) -> IdentityResponse:
        return IdentityResponse(
            subject=identity.subject,
            email=identity.email,
            displayName=identity.display_name,
        )

    @app.get("/courses", response_model=CourseListResponse, tags=["courses"])
    def list_courses(
        identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> CourseListResponse:
        courses = [
            RevisionedCourseResponse(revision=item.revision, data=item.data)
            for item in repo.list_courses(identity.subject)
        ]
        return CourseListResponse(courses=courses)

    @app.post(
        "/courses",
        status_code=status.HTTP_201_CREATED,
        response_model=RevisionedCourseResponse,
        tags=["courses"],
    )
    def create_course(
        request: CourseCreateRequest,
        identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> RevisionedCourseResponse:
        course = repo.create_course(request.data, identity.subject)
        return RevisionedCourseResponse(revision=course.revision, data=course.data)

    @app.get(
        "/courses/{course_id}",
        response_model=RevisionedCourseResponse,
        responses={404: {"model": ApiError}},
        tags=["courses"],
    )
    def get_course(
        course_id: str,
        _identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> RevisionedCourseResponse:
        course = repo.get_course(course_id)
        return RevisionedCourseResponse(revision=course.revision, data=course.data)

    @app.patch(
        "/courses/{course_id}",
        response_model=RevisionedCourseResponse,
        responses={409: {"model": ApiError}},
        tags=["courses"],
    )
    def patch_course(
        course_id: str,
        request: CoursePatchRequest,
        _identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> RevisionedCourseResponse:
        course = repo.patch_course(course_id, request.revision, request.data)
        return RevisionedCourseResponse(revision=course.revision, data=course.data)

    @app.delete(
        "/courses/{course_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        responses={409: {"model": ApiError}},
        tags=["courses"],
    )
    def delete_course(
        course_id: str,
        revision: int,
        _identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> Response:
        repo.delete_course(course_id, revision)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.get(
        "/courses/{course_id}/lessons/{lesson_id}",
        response_model=dict,
        responses={404: {"model": ApiError}},
        tags=["lessons"],
    )
    def get_lesson(
        course_id: str,
        lesson_id: str,
        _identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> dict:
        return repo.get_lesson(course_id, lesson_id)

    @app.put(
        "/courses/{course_id}/lessons/{lesson_id}",
        response_model=RevisionedCourseResponse,
        responses={409: {"model": ApiError}},
        tags=["lessons"],
    )
    def put_lesson(
        course_id: str,
        lesson_id: str,
        request: LessonPutRequest,
        _identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> RevisionedCourseResponse:
        course = repo.put_lesson(course_id, lesson_id, request.revision, request.data)
        return RevisionedCourseResponse(revision=course.revision, data=course.data)

    @app.get(
        "/courses/{course_id}/session",
        response_model=SessionResponse,
        responses={404: {"model": ApiError}},
        tags=["sessions"],
    )
    def get_session(
        course_id: str,
        identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> SessionResponse:
        session = repo.get_session(course_id, identity.subject)
        return SessionResponse(
            courseId=session.course_id,
            userSubject=session.user_subject,
            data=session.data,
            updatedAt=session.updated_at,
        )

    @app.put(
        "/courses/{course_id}/session",
        response_model=SessionResponse,
        responses={404: {"model": ApiError}},
        tags=["sessions"],
    )
    def put_session(
        course_id: str,
        request: SessionPutRequest,
        identity: Identity = Depends(get_identity),
        repo: CourseRepository = Depends(_get_repository),
    ) -> SessionResponse:
        session = repo.put_session(course_id, identity.subject, request.data)
        return SessionResponse(
            courseId=session.course_id,
            userSubject=session.user_subject,
            data=session.data,
            updatedAt=session.updated_at,
        )

    @app.post(
        "/media/uploads",
        status_code=status.HTTP_201_CREATED,
        response_model=MediaUploadResponse,
        responses={400: {"model": ApiError}},
        tags=["media"],
    )
    def create_media_upload(
        request: MediaUploadRequest,
        _identity: Identity = Depends(get_identity),
        upload_signer: LocalUploadSigner = Depends(_get_upload_signer),
    ) -> MediaUploadResponse:
        return upload_signer.create_upload(request)

    return app


def _get_repository(request: Request) -> CourseRepository:
    return request.app.state.repository


def _get_upload_signer(request: Request) -> LocalUploadSigner:
    return request.app.state.upload_signer


app = create_app()
