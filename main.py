import uvicorn
from authx import AuthX, AuthXConfig
from fastapi import Depends
from api import router as api_router
from create_fastapi_app import create_app

app = create_app(create_custom_static_urls=True)

#config = AuthXConfig(
#    JWT_SECRET_KEY="your-secret-key0",  # Change this!
#    JWT_TOKEN_LOCATION=["headers"],
#)

#auth = AuthX(config=config)
#auth.handle_errors(app)

app.include_router(api_router)


#@app.get("/protected", dependencies=[Depends(auth.access_token_required)])
#def protected():
#    return {"message": "Protected Hello World"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/t1")
def health_check2():
    return {"e": "t1"}


uvicorn.run(
    app,
    host="0.0.0.0",
    port=8000
)
