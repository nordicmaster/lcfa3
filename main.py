from authx import AuthX, AuthXConfig
﻿from api import router as api_router
from create_fastapi_app import create_app
from logging_config import setup_logging

#config = AuthXConfig(
#    JWT_SECRET_KEY="your-secret-key0",  # Change this!
#    JWT_TOKEN_LOCATION=["headers"],
#)
# Configure logging as early as possible so the `lcfa3.app`/`lcfa3.db`
# loggers have handlers before any request/query is processed.
setup_logging()

#auth = AuthX(config=config)
#auth.handle_errors(app)
app = create_app(create_custom_static_urls=True)

app.include_router(api_router)

#@app.get("/protected", dependencies=[Depends(auth.access_token_required)])
#def protected():
#    return {"message": "Protected Hello World"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
