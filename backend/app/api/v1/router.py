from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.events import router as events_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.matching import router as matching_router
from app.api.v1.routes.metrics import router as metrics_router
from app.api.v1.routes.photos import router as photos_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(photos_router)
api_router.include_router(matching_router)
api_router.include_router(metrics_router)
