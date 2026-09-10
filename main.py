from api import router as api_router
from create_fastapi_app import create_app
from logging_config import setup_logging

# Configure logging as early as possible so the `lcfa3.app`/`lcfa3.db`
# loggers have handlers before any request/query is processed.
setup_logging()

app = create_app(create_custom_static_urls=True)

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}
