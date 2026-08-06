from fastapi import APIRouter

from config import settings

from .artists import router as artists_router

router = APIRouter(prefix=settings.api.v1.prefix)
router.include_router(artists_router, prefix="/artists")
