from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.routers import repos, issues, webhooks

# Initialize FastAPI App
app = FastAPI(
    title="IssuePilot API",
    description="Backend API for IssuePilot - AI-powered GitHub Issue Triage Platform",
    version="1.0.0"
)

# Set up CORS (Next.js is typically on http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Include Routers
app.include_router(repos.router)
app.include_router(issues.router)
app.include_router(webhooks.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to IssuePilot API", "status": "running"}
