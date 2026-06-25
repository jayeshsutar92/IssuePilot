import os
from google.adk.workflow import Workflow
from google.adk.apps import App
from app.config import settings

import google.auth

# Configure environment for Gemini API (AI Studio or Vertex AI)
if settings.GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"
else:
    try:
        _, project_id = google.auth.default()
        if project_id:
            os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
        os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    except Exception:
        pass

from app.agent.nodes import (
    initialize_state,
    duplicate_detector,
    missing_info_checker,
    label_priority_predictor,
    merge_analysis,
    format_triage_summary
)
from app.agent.schemas import IssueTriageResult

# Define workflow edges
edges = [
    ('START', initialize_state),
    (initialize_state, (duplicate_detector, missing_info_checker, label_priority_predictor)),
    ((duplicate_detector, missing_info_checker, label_priority_predictor), merge_analysis),
    (merge_analysis, format_triage_summary)
]

# Create the Issue Triage Workflow Agent
root_agent = Workflow(
    name="issue_triage_workflow",
    edges=edges,
    description="Analyzes GitHub issues for priority, duplicates, and missing information.",
    output_schema=IssueTriageResult
)

# Export the app container
app = App(
    root_agent=root_agent,
    name="app" # Must match directory name 'app' for evaluation consistency
)
