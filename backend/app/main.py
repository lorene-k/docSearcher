from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import upload_router
from app.api.chat import chat_router

app = FastAPI(title="docSearcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(upload_router)
app.include_router(chat_router)
