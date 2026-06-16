################# by dennis jun 7th 2026 ############

from fastapi import FastAPI

from app.api.router import api_router

app = FastAPI(
    title="LifeFlow API",
    version="1.0.0"
)

app.include_router(api_router)