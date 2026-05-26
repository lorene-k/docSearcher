from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_public_key: str
    supabase_url: str
    google_ai_key: str
    
    class Config:
        env_file = ".env"


settings = Settings()