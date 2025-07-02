from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import getpass

load_dotenv()

# Get current system username
current_user = getpass.getuser()

# Get database URL from environment variable, or use a default for development
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://{current_user}@localhost/photo_logbook")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 