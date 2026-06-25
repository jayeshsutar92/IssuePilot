import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Request, BackgroundTasks
from sqlmodel import Session
from app.database import get_session
from app.models import Repository, IssueTriage
from app.services.triage import run_issue_triage

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.post("/github")
async def github_webhook_receiver(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    db: Session = Depends(get_session)
):
    """Receives webhook notifications from GitHub and triggers triage in background."""
    # We only process 'issues' events
    if x_github_event != "issues":
        return {"status": "ignored", "reason": f"Event type '{x_github_event}' is not triaged"}

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    action = payload.get("action")
    # Triage issues when opened or edited
    if action not in ["opened", "edited"]:
        return {"status": "ignored", "reason": f"Action '{action}' is not triaged"}

    issue_data = payload.get("issue")
    repo_data = payload.get("repository")
    
    if not issue_data or not repo_data:
        raise HTTPException(status_code=400, detail="Missing issue or repository details in payload")

    github_repo_id = repo_data.get("id")
    
    # Verify repository is active and connected in our DB
    repo = db.query(Repository).filter(
        Repository.github_id == github_repo_id,
        Repository.is_active == True
    ).first()
    
    if not repo:
        return {"status": "ignored", "reason": "Repository is not registered or active in IssuePilot"}

    issue_number = issue_data.get("number")
    title = issue_data.get("title")
    body = issue_data.get("body") or ""
    state = issue_data.get("state", "open")
    created_at_str = issue_data.get("created_at")

    try:
        github_created_at = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
    except Exception:
        github_created_at = datetime.datetime.utcnow()

    # Create or update database record
    db_issue = db.query(IssueTriage).filter(
        IssueTriage.repo_id == repo.id,
        IssueTriage.issue_number == issue_number
    ).first()

    if not db_issue:
        db_issue = IssueTriage(
            repo_id=repo.id,
            issue_number=issue_number,
            title=title,
            body=body,
            state=state,
            github_created_at=github_created_at
        )
    else:
        db_issue.title = title
        db_issue.body = body
        db_issue.state = state
        # Reset triage timestamp to trigger re-triage on edit
        db_issue.triaged_at = None

    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)

    # Queue ADK Triage in background task
    background_tasks.add_task(
        run_issue_triage,
        db,
        repo.id,
        repo.owner,
        repo.name,
        issue_number,
        title,
        body
    )

    return {"status": "queued", "issue_number": issue_number, "action": action}
