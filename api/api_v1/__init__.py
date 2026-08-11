from fastapi import APIRouter

from config import settings

from .artists import router as artists_router
from .user_stats import router as user_stats_router

router = APIRouter(prefix=settings.api.v1.prefix)
router.include_router(artists_router, prefix="/artists")
router.include_router(user_stats_router, prefix="/user_stats")
