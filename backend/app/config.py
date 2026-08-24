from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_public_key: str
    supabase_service_key: str
    supabase_url: str
    google_ai_key: str
    groq_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
