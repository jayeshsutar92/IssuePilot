import datetime
import uuid
from typing import List, Optional
from sqlmodel import Field, SQLModel, JSON, Column

class Repository(SQLModel, table=True):
    __tablename__ = "repositories"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    owner: str = Field(index=True)
    name: str = Field(index=True)
    github_id: int = Field(unique=True, index=True)
    webhook_secret: Optional[str] = Field(default=None, nullable=True)
    is_active: bool = Field(default=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

class IssueTriage(SQLModel, table=True):
    __tablename__ = "issue_triages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    repo_id: uuid.UUID = Field(foreign_key="repositories.id", index=True)
    issue_number: int = Field(index=True)
    title: str
    body: Optional[str] = Field(default=None, nullable=True)
    state: str = Field(default="open")
    priority: Optional[str] = Field(default=None, nullable=True) # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    is_duplicate: bool = Field(default=False)
    duplicate_issue_number: Optional[int] = Field(default=None, nullable=True)
    
    # Using Column(JSON) to support JSON list columns in standard SQLModel/SQLAlchemy
    missing_information: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    suggested_labels: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    
    rationale: Optional[str] = Field(default=None, nullable=True)
    github_created_at: datetime.datetime
    triaged_at: Optional[datetime.datetime] = Field(default=None, nullable=True)
