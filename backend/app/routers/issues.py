from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response #Bug fix
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session
from typing import List, Optional
from app.database import get_session
from app.models import IssueTriage, Repository
from app.services.triage import run_issue_triage
from app.config import settings
from fastapi.responses import JSONResponse
router = APIRouter(prefix="/api/issues", tags=["Issues"])

@router.get("", response_model=List[IssueTriage])
async def list_issues(
    repo_id: Optional[str] = None,
    priority: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    db: Session = Depends(get_session)
):
    query = db.query(IssueTriage)
    if repo_id:
        query = query.filter(IssueTriage.repo_id == repo_id)
    if priority:
        query = query.filter(IssueTriage.priority == priority)
    if is_duplicate is not None:
        query = query.filter(IssueTriage.is_duplicate == is_duplicate)
        
    # Sort issues (triaged first, or github created date)
    issues = query.order_by(IssueTriage.github_created_at.desc()).all()
    return JSONResponse(content=jsonable_encoder([issue.dict() for issue in issues]), headers={"Cache-Control": "no-store"})

@router.get("/{issue_id}", response_model=IssueTriage)
async def get_issue_details(issue_id: str, response: Response, db: Session = Depends(get_session)):
    response.headers["Cache-Control"] = "no-store"
    issue = db.query(IssueTriage).filter(IssueTriage.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.post("/{issue_id}/triage")
async def trigger_manual_triage(
    issue_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session)
):
    issue = db.query(IssueTriage).filter(IssueTriage.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    repo = db.query(Repository).filter(Repository.id == issue.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Clear current triage status to show loading in UI
    issue.triaged_at = None
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Run triage in background task
    background_tasks.add_task(
        run_issue_triage,
        repo.id,
        repo.owner,
        repo.name,
        issue.issue_number,
        issue.title,
        issue.body
    )

    return {"message": "Triage triggered in background", "issue": issue}
