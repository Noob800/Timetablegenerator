from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import time

# Input Schemas (for uploaded data)
class UnitInput(BaseModel):
    code: str = Field(..., description="Unit code (e.g., COMP 100)")
    name: str = Field(..., description="Unit name")
    credit_hours: int = Field(default=3, description="Credit hours")
    lecture_hours: int = Field(default=2, description="Lecture hours per week")
    lab_hours: int = Field(default=0, description="Lab hours per week")
    tutorial_hours: int = Field(default=0, description="Tutorial hours per week")
    program_groups: List[str] = Field(..., description="Programs taking this unit")

class LecturerInput(BaseModel):
    name: str
    department: str
    email: Optional[str] = None
    max_hours_per_week: int = Field(default=20, description="Maximum teaching hours")
    availability: Optional[List[str]] = Field(default=None, description="Available days")

class VenueInput(BaseModel):
    name: str
    capacity: int
    venue_type: Literal["Lecture Hall", "Lab", "Classroom", "Seminar Room"]
    equipment: Optional[List[str]] = Field(default_factory=list)

# Generation Request
class TimetableGenerationRequest(BaseModel):
    units: List[UnitInput]
    lecturers: List[LecturerInput]
    venues: List[VenueInput]
    constraints: Optional[dict] = Field(default_factory=dict)

# Output Schemas (generated timetable)
class SessionOutput(BaseModel):
    id: str
    unit_code: str
    unit_name: str
    lecturer_name: str
    venue_name: str
    day: Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    start_time: str  # "08:00"
    end_time: str    # "10:00"
    session_type: Literal["Lecture", "Lab", "Tutorial", "Seminar", "Exam"]
    program_groups: List[str]
    group_name: Optional[str] = None

class TimetableOutput(BaseModel):
    sessions: List[SessionOutput]
    conflicts: List[dict] = Field(default_factory=list)
    statistics: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)

# Database Models will go here
