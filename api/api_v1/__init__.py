from fastapi import APIRouter

from config import settings

from .main_page import router as main_router
from .artists import router as artists_router

router = APIRouter(prefix=settings.api.v1.prefix)
router.include_router(main_router, prefix="/main")
router.include_router(artists_router, prefix="")
