import json
import datetime
import uuid
import logging
from sqlmodel import Session
from google.adk.runners import InMemoryRunner
from google.genai import types
from app.agent.agent import app as adk_app
from app.models import IssueTriage
from app.database import engine

logger = logging.getLogger(__name__)

async def run_issue_triage(repo_id: str, owner: str, repo: str, issue_number: int, title: str, body: str) -> IssueTriage | None:
    """Runs the ADK agent workflow to triage an issue and saves the analysis to the database."""
    with Session(engine) as db_session:
        try:
            # 1. Fetch or create the issue record
            issue_record = db_session.query(IssueTriage).filter(
                IssueTriage.repo_id == repo_id,
                IssueTriage.issue_number == issue_number
            ).first()
            
            if not issue_record:
                issue_record = IssueTriage(
                    repo_id=repo_id,
                    issue_number=issue_number,
                    title=title or "Untitled",
                    body=body or "",
                    github_created_at=datetime.datetime.utcnow()
                )
                db_session.add(issue_record)
                db_session.commit()
                db_session.refresh(issue_record)

            # 2. Setup the ADK Workflow runner
            runner = InMemoryRunner(app=adk_app)
            
            # Create the ADK session with a unique user_id to isolate memory
            unique_user_id = f"issue_{issue_number}_{uuid.uuid4().hex[:6]}"
            adk_session = await runner.session_service.create_session(
                app_name="app",
                user_id=unique_user_id
            )
            
            # Format input payload safely
            input_data = {
                "issue_number": issue_number,
                "title": title or "Untitled",
                "body": body or "No description",
                "owner": owner,
                "repo": repo
            }
            
            # Run the workflow
            output_result = None
            async for event in runner.run_async(
                user_id=unique_user_id,
                session_id=adk_session.id,
                new_message=types.Content(role="user", parts=[types.Part.from_text(text=json.dumps(input_data))])
            ):
                if event.output is not None:
                    output_result = event.output
                    
            if output_result:
                # Extract data from Pydantic model or dict
                if hasattr(output_result, "model_dump"):
                    data = output_result.model_dump()
                elif isinstance(output_result, dict):
                    data = output_result
                else:
                    data = {}
                    
                if data:
                    issue_record.priority = data.get("priority")
                    issue_record.is_duplicate = data.get("is_duplicate", False)
                    issue_record.duplicate_issue_number = data.get("duplicate_issue_number")
                    issue_record.missing_information = data.get("missing_information", [])
                    issue_record.suggested_labels = data.get("suggested_labels", [])
                    issue_record.rationale = data.get("rationale")
                    issue_record.suggested_maintainer_response = data.get("suggested_maintainer_response")
                    issue_record.triaged_at = datetime.datetime.utcnow()
                    
                    db_session.add(issue_record)
                    db_session.commit()
                    db_session.refresh(issue_record)
                    
            return issue_record
        except Exception as e:
            logger.error(f"Error during triage for issue #{issue_number}: {str(e)}", exc_info=True)
            return None
