from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IdentityResponse(StrictBaseModel):
    subject: str
    email: str | None
    displayName: str | None


class CourseCreateRequest(StrictBaseModel):
    data: dict[str, Any]


class CoursePatchRequest(StrictBaseModel):
    revision: int = Field(ge=1)
    data: dict[str, Any]


class LessonPutRequest(StrictBaseModel):
    revision: int = Field(ge=1)
    data: dict[str, Any]


class RevisionedCourseResponse(StrictBaseModel):
    revision: int
    data: dict[str, Any]


class CourseListResponse(StrictBaseModel):
    courses: list[RevisionedCourseResponse]


class SessionPutRequest(StrictBaseModel):
    data: dict[str, Any]


class SessionResponse(StrictBaseModel):
    courseId: str
    userSubject: str
    data: dict[str, Any]
    updatedAt: str | None


UploadKind = Literal["image", "video", "audio", "attachment", "captions"]


class MediaUploadRequest(StrictBaseModel):
    kind: UploadKind
    filename: str = Field(min_length=1, max_length=255)
    mime: str = Field(min_length=1, max_length=255)
    bytes: int = Field(gt=0)
    sha256: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")


class UploadValidationResponse(StrictBaseModel):
    status: Literal["stubbed"]
    checks: list[str]


class MediaUploadResponse(StrictBaseModel):
    mediaId: str
    uploadUrl: str
    method: Literal["PUT"]
    headers: dict[str, str]
    expiresAt: str
    storageKey: str
    validation: UploadValidationResponse
