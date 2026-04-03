from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.init_db import init_db

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def on_startup() -> None:
    if settings.auto_create_tables:
        init_db()


@app.get("/")
def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs"}


if settings.storage_backend.lower() == "local":
    local_storage_path = Path(settings.local_storage_path).resolve()
    local_storage_path.mkdir(parents=True, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=local_storage_path), name="storage")
