from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from forge_api.errors import ApiProblem
from forge_api.schemas import MediaUploadRequest, MediaUploadResponse, UploadValidationResponse


MAX_BYTES_BY_KIND = {
    "image": 20 * 1024 * 1024,
    "video": 500 * 1024 * 1024,
    "audio": 100 * 1024 * 1024,
    "attachment": 100 * 1024 * 1024,
    "captions": 10 * 1024 * 1024,
}

MIME_PREFIXES_BY_KIND = {
    "image": ("image/",),
    "video": ("video/",),
    "audio": ("audio/",),
    "attachment": ("application/", "text/", "image/", "video/", "audio/"),
    "captions": ("text/vtt",),
}


class LocalUploadSigner:
    """Fake local signer with the same boundary a GCS signer will implement."""

    def create_upload(self, request: MediaUploadRequest) -> MediaUploadResponse:
        _validate_upload_request(request)
        media_id = f"media_{uuid4().hex}"
        storage_key = f"local/{media_id}/{request.filename}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat().replace(
            "+00:00", "Z"
        )
        return MediaUploadResponse(
            mediaId=media_id,
            uploadUrl=f"http://local.forge/uploads/{storage_key}",
            method="PUT",
            headers={"Content-Type": request.mime},
            expiresAt=expires_at,
            storageKey=storage_key,
            validation=UploadValidationResponse(
                status="stubbed",
                checks=["mime", "size", "sha256", "post_upload_probe"],
            ),
        )


def _validate_upload_request(request: MediaUploadRequest) -> None:
    prefixes = MIME_PREFIXES_BY_KIND[request.kind]
    if not request.mime.startswith(prefixes):
        raise ApiProblem(
            status_code=400,
            code="invalid_upload",
            message="Upload MIME type is not allowed for the requested media kind.",
            details={"field": "mime", "kind": request.kind, "mime": request.mime},
        )

    max_bytes = MAX_BYTES_BY_KIND[request.kind]
    if request.bytes > max_bytes:
        raise ApiProblem(
            status_code=400,
            code="invalid_upload",
            message="Upload exceeds the configured size limit.",
            details={"field": "bytes", "maxBytes": max_bytes},
        )
