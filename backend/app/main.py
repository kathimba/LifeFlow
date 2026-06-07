################# by dennis jun 7th 2026 ############

from fastapi import FastAPI

app = FastAPI(
    title="LifeFlow API",
    version="1.0.0"
)

@app.get("/")
def root():
    return {"message": "LifeFlow API Running"}