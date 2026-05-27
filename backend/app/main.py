from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import upload_router
from app.api.chat import chat_router
from app.api.documents import documents_router

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
app.include_router(documents_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
