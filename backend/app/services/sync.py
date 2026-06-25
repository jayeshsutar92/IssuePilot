import datetime
from sqlmodel import Session
from app.services.github import GitHubClient
from app.services.triage import run_issue_triage
from app.models import Repository, IssueTriage

async def sync_repository_issues(db_session: Session, repo: Repository, pat: str):
    """Syncs the issues for a single repository from GitHub and triages them."""
    client = GitHubClient(pat=pat)
    try:
        # 1. Fetch issues from GitHub API
        github_issues = await client.get_repository_issues(owner=repo.owner, repo=repo.name)
        
        for gh_issue in github_issues:
            issue_number = gh_issue.get("number")
            title = gh_issue.get("title")
            body = gh_issue.get("body") or ""
            state = gh_issue.get("state", "open")
            github_created_at_str = gh_issue.get("created_at")
            
            # Parse datetime
            try:
                github_created_at = datetime.datetime.fromisoformat(github_created_at_str.replace("Z", "+00:00"))
            except Exception:
                github_created_at = datetime.datetime.utcnow()

            # Check if issue already exists in db
            db_issue = db_session.query(IssueTriage).filter(
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
                db_session.add(db_issue)
                db_session.commit()
                db_session.refresh(db_issue)

            # Trigger triage if not already triaged
            if not db_issue.triaged_at:
                try:
                    await run_issue_triage(
                        db_session=db_session,
                        repo_id=repo.id,
                        owner=repo.owner,
                        repo=repo.name,
                        issue_number=issue_number,
                        title=title,
                        body=body
                    )
                except Exception as triage_err:
                    print(f"Error triaging issue {repo.owner}/{repo.name}#{issue_number}: {triage_err}")

    except Exception as e:
        print(f"Error syncing repository {repo.owner}/{repo.name}: {e}")
    finally:
        await client.close()
