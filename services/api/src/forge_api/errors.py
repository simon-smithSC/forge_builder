from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiError(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ApiProblem(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any | None = None):
        self.status_code = status_code
        self.error = ApiError(code=code, message=message, details=details)


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiProblem)
    async def api_problem_handler(_request: Request, exc: ApiProblem) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.error.model_dump())

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ApiError(
                code="request_validation_failed",
                message="Request did not match the API contract.",
                details=exc.errors(),
            ).model_dump(),
        )
