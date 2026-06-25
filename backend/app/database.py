from sqlmodel import create_engine, SQLModel, Session
from app.config import settings

# Create engine
# Using connect_args={"check_same_thread": False} only if we use SQLite, but we use PostgreSQL.
# However, SQLModel creation is standard.
engine = create_engine(settings.DATABASE_URL, echo=True)

def create_db_and_tables():
    # Import models here to make sure they are registered on SQLModel.metadata
    from app.models import Repository, IssueTriage
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
