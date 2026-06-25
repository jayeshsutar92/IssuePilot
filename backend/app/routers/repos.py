import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from pydantic import BaseModel
from typing import List
from app.database import get_session
from app.models import Repository
from app.services.github import GitHubClient
from app.services.sync import sync_repository_issues

router = APIRouter(prefix="/api/repos", tags=["Repositories"])

class ConnectRepoRequest(BaseModel):
    owner: str
    name: str
    pat: str

class RepoResponse(BaseModel):
    id: uuid.UUID
    owner: str
    name: str
    github_id: int
    is_active: bool

@router.post("/connect", response_model=RepoResponse)
async def connect_repository(
    request: ConnectRepoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session)
):
    # 1. Verify credentials and get repo info from GitHub
    client = GitHubClient(pat=request.pat)
    try:
        # Fetch repository details to verify PAT & ownership
        response = await client.client.get(f"https://api.github.com/repos/{request.owner}/{request.name}")
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to verify repository on GitHub: {response.text}"
            )
        repo_data = response.json()
        github_id = repo_data.get("id")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.close()

    # 2. Check if already connected
    existing_repo = db.query(Repository).filter(Repository.github_id == github_id).first()
    if existing_repo:
        existing_repo.is_active = True
        db.add(existing_repo)
        db.commit()
        db.refresh(existing_repo)
        
        # Trigger background sync
        background_tasks.add_task(sync_repository_issues, db, existing_repo, request.pat)
        return existing_repo

    # 3. Create repository record
    new_repo = Repository(
        owner=request.owner,
        name=request.name,
        github_id=github_id,
        is_active=True
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    # 4. Trigger initial background synchronization
    background_tasks.add_task(sync_repository_issues, db, new_repo, request.pat)

    return new_repo

@router.get("", response_model=List[RepoResponse])
async def list_repositories(db: Session = Depends(get_session)):
    return db.query(Repository).all()

@router.delete("/{repo_id}")
async def disconnect_repository(repo_id: str, db: Session = Depends(get_session)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    db.delete(repo)
    db.commit()
    return {"message": "Repository disconnected successfully"}
