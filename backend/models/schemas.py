from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from datetime import time

# Input Schemas (for uploaded data)
class UnitInput(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="Unit code (e.g., COMP 100)")
    name: str = Field(..., min_length=1, max_length=200, description="Unit name")
    credit_hours: int = Field(default=3, ge=1, le=10, description="Credit hours (1-10)")
    lecture_hours: int = Field(default=2, ge=0, le=10, description="Lecture hours per week (0-10)")
    lab_hours: int = Field(default=0, ge=0, le=10, description="Lab hours per week (0-10)")
    tutorial_hours: int = Field(default=0, ge=0, le=10, description="Tutorial hours per week (0-10)")
    program_groups: List[str] = Field(..., min_length=1, description="Programs taking this unit (at least 1)")
    
    @field_validator('code')
    @classmethod
    def code_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Unit code cannot be empty')
        return v.strip().upper()
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Unit name cannot be empty')
        return v.strip()

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

class LecturerInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Lecturer name")
    department: str = Field(..., min_length=1, max_length=200, description="Department")
    email: Optional[str] = Field(default=None, max_length=200, description="Email address")
    max_hours_per_week: int = Field(default=20, ge=1, le=60, description="Maximum teaching hours (1-60)")
    availability: Optional[List[str]] = Field(default=None, description="Available days")
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Lecturer name cannot be empty')
        return v.strip()
    
    @field_validator('availability')
    @classmethod
    def validate_days(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        for day in v:
            if day not in VALID_DAYS:
                raise ValueError(f'Invalid day: {day}. Must be one of {VALID_DAYS}')
        return v

class VenueInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Venue name")
    capacity: int = Field(..., ge=1, le=10000, description="Venue capacity (1-10000)")
    venue_type: Literal["Lecture Hall", "Lab", "Classroom", "Seminar Room"]
    equipment: Optional[List[str]] = Field(default_factory=list)
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Venue name cannot be empty')
        return v.strip()

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
    name: str = "Draft Timetable"
    version: int = 1
    is_active: bool = False

# Settings Schemas
class TimeAllocationPattern(BaseModel):
    pattern: List[int] = Field(..., description="Pattern of hours, e.g., [3] for 3-hour block, [2,1] for 2+1")
    label: str = Field(..., description="Human-readable label for this pattern")

class SettingsInput(BaseModel):
    # Academic Calendar
    academic_year: str = Field(..., min_length=4, max_length=20, description="Academic year (e.g., 2024/2025)")
    trimester: str = Field(..., pattern="^[1-3]$", description="Trimester (1, 2, or 3)")
    
    # Schedule Configuration
    schedule_start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Start time (HH:MM)")
    schedule_end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="End time (HH:MM)")
    session_duration: int = Field(..., ge=30, le=180, description="Session duration in minutes (30-180)")
    break_duration: int = Field(..., ge=10, le=30, description="Break duration in minutes (10-30)")
    
    # Institutional Events (Dynamic)
    institutional_events: List[dict] = Field(
        default_factory=lambda: [
            {"name": "Monday Devotion", "day": "Monday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
            {"name": "Thursday Devotion", "day": "Thursday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
            {"name": "Wednesday Sports", "day": "Wednesday", "start_time": "16:00", "end_time": "18:00", "enabled": True, "color": "orange"}
        ],
        description="List of institutional events with custom names, days, times, and colors"
    )
    
    # Time Allocation Configuration (Flexible System)
    semester_weeks: int = Field(default=14, ge=1, le=52, description="Number of weeks in the semester")
    total_hours_per_unit: int = Field(default=42, ge=1, le=200, description="Total teaching hours per unit per semester")
    allowed_patterns: List[TimeAllocationPattern] = Field(
        default_factory=lambda: [
            {"pattern": [3], "label": "3 hours straight"},
            {"pattern": [2, 1], "label": "2 hours + 1 hour"},
            {"pattern": [1, 2], "label": "1 hour + 2 hours"}
        ],
        description="Allowed weekly time-block patterns"
    )
    prefer_three_hour_blocks: bool = Field(default=True, description="Prefer 3-hour blocks when selecting patterns")
    allow_split_blocks: bool = Field(default=True, description="Allow split patterns like 2+1 or 1+2")
    
    # Constraint Settings
    respect_lecturer_availability: bool = Field(default=False, description="Enforce lecturer availability constraints during scheduling")
    balance_daily_load: bool = Field(default=True, description="Distribute sessions evenly across weekdays to avoid empty days")
    max_lecturer_hours_per_week: int = Field(default=20, ge=1, le=60, description="Maximum teaching hours per lecturer per week")
    
    # Notifications
    enable_conflict_notifications: bool = Field(default=True)
    enable_generation_notifications: bool = Field(default=True)

class SettingsOutput(SettingsInput):
    id: int
    created_at: str
    updated_at: str

# Unit Weekly Override Schemas
class UnitWeeklyOverrideCreate(BaseModel):
    unit_code: str = Field(..., min_length=1, max_length=50, description="Unit code to override")
    custom_weekly_hours: int = Field(..., ge=1, le=20, description="Custom weekly hours for this unit (1-20)")
    notes: Optional[str] = Field(default=None, max_length=500, description="Optional notes about this override")
    
    @field_validator('unit_code')
    @classmethod
    def code_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Unit code cannot be empty')
        return v.strip().upper()

class UnitWeeklyOverrideResponse(BaseModel):
    id: int
    unit_code: str
    custom_weekly_hours: int
    notes: Optional[str]
    created_at: str
    updated_at: str

class UnitWithOverrideInfo(BaseModel):
    code: str
    name: str
    global_weekly_hours: int  # Calculated from settings (total_hours / semester_weeks)
    has_override: bool
    override_weekly_hours: Optional[int]
    effective_weekly_hours: int  # The actual hours used (override or global)
    override_notes: Optional[str]

# Database Models will go here

