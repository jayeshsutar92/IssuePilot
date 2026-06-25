import os
from dotenv import load_dotenv

# Load env variables from .env if present
load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/issuepilot")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    GITHUB_PAT: str = os.getenv("GITHUB_PAT", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
