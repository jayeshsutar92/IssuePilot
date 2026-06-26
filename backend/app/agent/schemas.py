from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class PriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DuplicateCheckResult(BaseModel):
    is_duplicate: bool = Field(description="True if the issue is a duplicate of an existing issue.")
    duplicate_issue_number: Optional[int] = Field(None, description="The issue number of the duplicate, if found.")
    rationale: str = Field(description="Explanation of why this issue is or is not a duplicate, citing similar issues.")

class MissingInfoResult(BaseModel):
    is_missing_info: bool = Field(description="True if key diagnostic or reproduction details are missing from the report.")
    missing_fields: List[str] = Field(default_factory=list, description="List of missing items (e.g. 'steps to reproduce', 'logs', 'environment info', 'expected behavior').")
    rationale: str = Field(description="Brief explanation of what crucial information is missing and why it is needed.")

class LabelPriorityResult(BaseModel):
    suggested_labels: List[str] = Field(default_factory=list, description="Suggested labels to apply (e.g. 'bug', 'feature request', 'documentation', 'refactor', 'regression').")
    priority: PriorityEnum = Field(description="Triage priority level based on severity and impact.")
    rationale: str = Field(description="Reasoning for the assigned priority and suggested labels.")
    suggested_response: str = Field(description="A draft of a polite, contextual response to the issue creator. If duplicate, mention the duplicate issue; if missing info, list the specific missing details politely; otherwise, thank them and state next steps.")

class IssueTriageResult(BaseModel):
    issue_number: int
    title: str
    priority: PriorityEnum
    is_duplicate: bool
    duplicate_issue_number: Optional[int] = None
    missing_information: List[str] = Field(default_factory=list)
    suggested_labels: List[str] = Field(default_factory=list)
    rationale: str = Field(description="Comprehensive summary of the triage analysis combining duplicate checks, missing info, and priority logic.")
    suggested_maintainer_response: Optional[str] = Field(None, description="Suggested response for the maintainer to send to the issue author.")
