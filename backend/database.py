from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Table, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.types import JSON
from datetime import datetime
import os

# Get database URL from environment or use SQLite as fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./timetable.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Association table for many-to-many relationship between units and lecturers
unit_lecturer_assignment = Table(
    'unit_lecturer_assignment',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('unit_id', Integer, ForeignKey('units.id', ondelete='CASCADE')),
    Column('lecturer_id', Integer, ForeignKey('lecturers.id', ondelete='CASCADE')),
    Column('is_primary', Boolean, default=True),  # Primary vs assistant
    Column('created_at', DateTime, default=datetime.utcnow)
)

class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    credit_hours = Column(Integer, default=3)
    lecture_hours = Column(Integer, default=2)
    lab_hours = Column(Integer, default=0)
    tutorial_hours = Column(Integer, default=0)
    program_groups = Column(JSON, default=list)  # Store as JSON array
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    lecturers = relationship("Lecturer", secondary=unit_lecturer_assignment, back_populates="units")
    sessions = relationship("Session", back_populates="unit", cascade="all, delete-orphan")

class Lecturer(Base):
    __tablename__ = "lecturers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    department = Column(String)
    email = Column(String, unique=True, nullable=True)
    max_hours_per_week = Column(Integer, default=20)
    availability = Column(JSON, default=list)  # List of available days
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    units = relationship("Unit", secondary=unit_lecturer_assignment, back_populates="lecturers")
    sessions = relationship("Session", back_populates="lecturer", cascade="all, delete-orphan")

class Venue(Base):
    __tablename__ = "venues"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    capacity = Column(Integer, nullable=False)
    venue_type = Column(String, nullable=False)  # Lecture Hall, Lab, Classroom, Seminar Room
    equipment = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", back_populates="venue", cascade="all, delete-orphan")

class Timetable(Base):
    __tablename__ = "timetables"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=False)  # Only one active timetable at a time
    statistics = Column(JSON, default=dict)  # Store computed stats
    conflicts = Column(JSON, default=list)  # Store detected conflicts
    generation_metadata = Column(JSON, default=dict)  # Renamed from metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", back_populates="timetable", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey('timetables.id', ondelete='CASCADE'), nullable=False)
    unit_id = Column(Integer, ForeignKey('units.id', ondelete='CASCADE'), nullable=False)
    lecturer_id = Column(Integer, ForeignKey('lecturers.id', ondelete='CASCADE'), nullable=False)
    venue_id = Column(Integer, ForeignKey('venues.id', ondelete='CASCADE'), nullable=False)
    
    day = Column(String, nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(String, nullable=False)  # "08:00"
    end_time = Column(String, nullable=False)  # "10:00"
    session_type = Column(String, nullable=False)  # Lecture, Lab, Tutorial, etc.
    program_groups = Column(JSON, default=list)
    group_name = Column(String, nullable=True)  # For parallel sessions (Group A, B, etc.)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    timetable = relationship("Timetable", back_populates="sessions")
    unit = relationship("Unit", back_populates="sessions")
    lecturer = relationship("Lecturer", back_populates="sessions")
    venue = relationship("Venue", back_populates="sessions")

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    # Academic Calendar
    academic_year = Column(String, nullable=False, default="2024/2025")
    trimester = Column(String, nullable=False, default="1")
    
    # Schedule Configuration
    schedule_start_time = Column(String, nullable=False, default="08:00")
    schedule_end_time = Column(String, nullable=False, default="18:00")
    session_duration = Column(Integer, nullable=False, default=60)  # minutes
    break_duration = Column(Integer, nullable=False, default=15)  # minutes
    
    # Institutional Events (Dynamic JSON)
    institutional_events = Column(JSON, nullable=True, default=None)
    
    # Time Allocation Configuration (Flexible System)
    semester_weeks = Column(Integer, nullable=True, default=14)  # Number of weeks in semester
    total_hours_per_unit = Column(Integer, nullable=True, default=42)  # Total teaching hours per unit per semester
    allowed_patterns = Column(JSON, nullable=True, default=None)  # Allowed weekly patterns, e.g., [{"pattern": [3], "label": "3 hours straight"}, {"pattern": [2, 1], "label": "2+1 hours"}]
    prefer_three_hour_blocks = Column(Boolean, nullable=True, default=True)  # Prefer 3-hour blocks when possible
    allow_split_blocks = Column(Boolean, nullable=True, default=True)  # Allow split patterns like 2+1 or 1+2
    
    # Constraint Settings
    respect_lecturer_availability = Column(Boolean, nullable=True, default=False)  # Whether to enforce lecturer availability constraints
    balance_daily_load = Column(Boolean, nullable=True, default=True)  # Distribute sessions evenly across days
    max_lecturer_hours_per_week = Column(Integer, nullable=True, default=20)  # Maximum hours per lecturer per week
    
    # Notifications
    enable_conflict_notifications = Column(Boolean, default=True)
    enable_generation_notifications = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UnitWeeklyOverride(Base):
    __tablename__ = "unit_weekly_overrides"
    
    id = Column(Integer, primary_key=True, index=True)
    unit_code = Column(String, unique=True, nullable=False, index=True)  # References Unit.code
    custom_weekly_hours = Column(Integer, nullable=False)  # Override weekly hours for this unit
    notes = Column(Text, nullable=True)  # Optional notes about why this override exists
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Database initialization
def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables on import
init_db()
