from fastapi import APIRouter

from config import settings

from .main_page import router as main_router

router = APIRouter(prefix=settings.api.v1.prefix)
router.include_router(main_router, prefix="/main")
