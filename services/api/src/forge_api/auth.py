from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from fastapi import Request
from starlette.datastructures import Headers

from forge_api.errors import ApiProblem


@dataclass(frozen=True)
class Identity:
    subject: str
    email: str | None
    display_name: str | None


SUBJECT_HEADERS = (
    "x-okta-subject",
    "x-forwarded-user",
    "x-goog-authenticated-user-email",
    "x-authenticated-user-email",
)
EMAIL_HEADERS = (
    "x-forwarded-email",
    "x-okta-email",
    "x-goog-authenticated-user-email",
    "x-authenticated-user-email",
)
NAME_HEADERS = ("x-forwarded-name", "x-okta-name")


def get_identity(request: Request) -> Identity:
    headers = request.headers
    subject = _first_header(headers, SUBJECT_HEADERS)
    email = _first_header(headers, EMAIL_HEADERS)
    display_name = _first_header(headers, NAME_HEADERS)

    if subject is None:
        raise ApiProblem(
            status_code=401,
            code="missing_identity",
            message="Okta forwarded identity headers were not present.",
        )

    subject = _strip_gateway_prefix(subject)
    if email is not None:
        email = _strip_gateway_prefix(email)

    return Identity(subject=subject, email=email, display_name=display_name)


def _first_header(headers: Headers, names: Iterable[str]) -> str | None:
    for name in names:
        value = headers.get(name)
        if value:
            return value
    return None


def _strip_gateway_prefix(value: str) -> str:
    for prefix in ("accounts.google.com:", "okta:"):
        if value.startswith(prefix):
            return value[len(prefix) :]
    return value
