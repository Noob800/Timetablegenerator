from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from services.file_parser import FileParser
from services.timetable_solver import TimetableSolver
from models.schemas import (
    TimetableGenerationRequest,
    TimetableOutput,
    UnitInput,
    LecturerInput,
    VenueInput,
    SessionOutput,
    SettingsInput,
    SettingsOutput,
    UnitWeeklyOverrideCreate,
    UnitWeeklyOverrideResponse,
    UnitWithOverrideInfo
)
from database import (
    get_db, Unit, Lecturer, Venue, Timetable, Session as DBSession,
    unit_lecturer_assignment, Settings, UnitWeeklyOverride
)
from datetime import datetime

router = APIRouter(prefix="/api", tags=["timetable"])

# ============= UPLOAD ENDPOINTS =============

@router.post("/upload/units")
async def upload_units(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload units CSV/XLSX file and save to database"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        units_input = await parser.parse_units_file(content, file_ext)
        
        # Save to database
        saved_count = 0
        for unit_data in units_input:
            # Check if unit exists
            existing = db.query(Unit).filter(Unit.code == unit_data.code).first()
            if existing:
                # Update existing
                existing.name = unit_data.name
                existing.credit_hours = unit_data.credit_hours
                existing.lecture_hours = unit_data.lecture_hours
                existing.lab_hours = unit_data.lab_hours
                existing.tutorial_hours = unit_data.tutorial_hours
                existing.program_groups = unit_data.program_groups
                existing.updated_at = datetime.utcnow()
            else:
                # Create new
                new_unit = Unit(
                    code=unit_data.code,
                    name=unit_data.name,
                    credit_hours=unit_data.credit_hours,
                    lecture_hours=unit_data.lecture_hours,
                    lab_hours=unit_data.lab_hours,
                    tutorial_hours=unit_data.tutorial_hours,
                    program_groups=unit_data.program_groups
                )
                db.add(new_unit)
            saved_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Uploaded {saved_count} units successfully",
            "count": saved_count,
            "preview": [u.dict() for u in units_input[:5]]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/lecturers")
async def upload_lecturers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload lecturers CSV/XLSX file and save to database"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        lecturers_input = await parser.parse_lecturers_file(content, file_ext)
        
        saved_count = 0
        for lect_data in lecturers_input:
            try:
                # Check if lecturer exists
                existing = db.query(Lecturer).filter(Lecturer.email == lect_data.email).first() if lect_data.email else None
                if existing:
                    existing.name = lect_data.name
                    existing.department = lect_data.department
                    existing.max_hours_per_week = lect_data.max_hours_per_week
                    existing.availability = lect_data.availability
                    existing.updated_at = datetime.utcnow()
                else:
                    new_lecturer = Lecturer(
                        name=lect_data.name,
                        department=lect_data.department,
                        email=lect_data.email,
                        max_hours_per_week=lect_data.max_hours_per_week,
                        availability=lect_data.availability
                    )
                    db.add(new_lecturer)
                db.flush()  # Flush to catch unique constraint errors per lecturer
                saved_count += 1
            except Exception as e:
                # Skip duplicate emails
                print(f"Skipping lecturer {lect_data.name}: {str(e)}")
                continue
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Uploaded {saved_count} lecturers successfully",
            "count": saved_count,
            "preview": [l.dict() for l in lecturers_input[:5]]
        }
    except Exception as e:
        db.rollback()
        print(f"Lecturers upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/venues")
async def upload_venues(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload venues CSV/XLSX file and save to database"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        venues_input = await parser.parse_venues_file(content, file_ext)
        
        saved_count = 0
        for venue_data in venues_input:
            existing = db.query(Venue).filter(Venue.name == venue_data.name).first()
            if existing:
                existing.capacity = venue_data.capacity
                existing.venue_type = venue_data.venue_type
                existing.equipment = venue_data.equipment
                existing.updated_at = datetime.utcnow()
            else:
                new_venue = Venue(
                    name=venue_data.name,
                    capacity=venue_data.capacity,
                    venue_type=venue_data.venue_type,
                    equipment=venue_data.equipment
                )
                db.add(new_venue)
            saved_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Uploaded {saved_count} venues successfully",
            "count": saved_count,
            "preview": [v.dict() for v in venues_input[:5]]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/upload/status")
async def get_upload_status(db: Session = Depends(get_db)):
    """Check what data is in database"""
    units_count = db.query(Unit).count()
    lecturers_count = db.query(Lecturer).count()
    venues_count = db.query(Venue).count()
    
    return {
        "units": units_count,
        "lecturers": lecturers_count,
        "venues": venues_count,
        "ready": all([units_count > 0, lecturers_count > 0, venues_count > 0])
    }

# ============= DATA RETRIEVAL ENDPOINTS =============

@router.get("/units")
async def get_all_units(db: Session = Depends(get_db)):
    """Get all units from database"""
    units = db.query(Unit).all()
    return [{
        "id": str(u.id),
        "code": u.code,
        "name": u.name,
        "credit_hours": u.credit_hours,
        "lecture_hours": u.lecture_hours,
        "lab_hours": u.lab_hours,
        "tutorial_hours": u.tutorial_hours,
        "program_groups": u.program_groups
    } for u in units]

@router.get("/lecturers")
async def get_all_lecturers(db: Session = Depends(get_db)):
    """Get all lecturers from database"""
    lecturers = db.query(Lecturer).all()
    return [{
        "id": str(l.id),
        "name": l.name,
        "department": l.department,
        "email": l.email,
        "max_hours_per_week": l.max_hours_per_week,
        "availability": l.availability
    } for l in lecturers]

@router.get("/venues")
async def get_all_venues(db: Session = Depends(get_db)):
    """Get all venues from database"""
    venues = db.query(Venue).all()
    return [{
        "id": str(v.id),
        "name": v.name,
        "capacity": v.capacity,
        "type": v.venue_type,
        "equipment": v.equipment
    } for v in venues]

# ============= TIMETABLE GENERATION =============

@router.post("/generate", response_model=TimetableOutput)
async def generate_timetable(db: Session = Depends(get_db)):
    """Generate timetable using data from database"""
    try:
        # Get data from database
        units = db.query(Unit).all()
        lecturers = db.query(Lecturer).all()
        venues = db.query(Venue).all()
        
        print(f"Database counts - Units: {len(units)}, Lecturers: {len(lecturers)}, Venues: {len(venues)}")
        
        if not all([units, lecturers, venues]):
            raise HTTPException(
                status_code=400,
                detail="Please upload all required data (units, lecturers, venues) before generating"
            )
        
        # Get settings first (needed for lecturer max hours)
        settings = get_or_create_settings(db)
        global_max_hours = settings.max_lecturer_hours_per_week if hasattr(settings, 'max_lecturer_hours_per_week') else 20
        
        # Convert to input schemas
        try:
            units_input = [UnitInput(
                code=u.code,
                name=u.name,
                credit_hours=u.credit_hours,
                lecture_hours=u.lecture_hours,
                lab_hours=u.lab_hours,
                tutorial_hours=u.tutorial_hours,
                program_groups=u.program_groups or []
            ) for u in units]
            print(f"Converted {len(units_input)} units to input schemas")
        except Exception as e:
            print(f"Error converting units: {e}")
            raise
        
        lecturers_input = []
        for l in lecturers:
            try:
                # Use lecturer's max hours if set, otherwise use global setting
                max_hours = l.max_hours_per_week if l.max_hours_per_week else global_max_hours
                # Try with email first
                lecturer = LecturerInput(
                    name=l.name,
                    department=l.department,
                    email=l.email,
                    max_hours_per_week=max_hours,
                    availability=l.availability
                )
                lecturers_input.append(lecturer)
            except Exception as e:
                # If email validation fails, use None
                print(f"Warning: Invalid email for {l.name}: {l.email}, using None")
                max_hours = l.max_hours_per_week if l.max_hours_per_week else global_max_hours
                lecturer = LecturerInput(
                    name=l.name,
                    department=l.department,
                    email=None,
                    max_hours_per_week=max_hours,
                    availability=l.availability
                )
                lecturers_input.append(lecturer)
        print(f"Converted {len(lecturers_input)} lecturers to input schemas (using global max {global_max_hours}h/week as default)")
        
        venues_input = [VenueInput(
            name=v.name,
            capacity=v.capacity,
            venue_type=v.venue_type,
            equipment=v.equipment or []
        ) for v in venues]
        print(f"Converted {len(venues_input)} venues to input schemas")
        
        # Build settings dict for solver
        settings_dict = {
            'schedule_start_time': settings.schedule_start_time,
            'schedule_end_time': settings.schedule_end_time,
            'session_duration': settings.session_duration,
            'institutional_events': settings.institutional_events if settings.institutional_events else [],
            'semester_weeks': settings.semester_weeks,
            'total_hours_per_unit': settings.total_hours_per_unit,
            'allowed_patterns': settings.allowed_patterns if settings.allowed_patterns else [],
            'prefer_three_hour_blocks': settings.prefer_three_hour_blocks,
            'allow_split_blocks': settings.allow_split_blocks,
            'respect_lecturer_availability': settings.respect_lecturer_availability if hasattr(settings, 'respect_lecturer_availability') else False,
            'balance_daily_load': settings.balance_daily_load if hasattr(settings, 'balance_daily_load') else True,
            'max_lecturer_hours_per_week': settings.max_lecturer_hours_per_week if hasattr(settings, 'max_lecturer_hours_per_week') else 20
        }
        print(f"Using settings: {settings_dict}")
        
        # Get unit overrides
        overrides = db.query(UnitWeeklyOverride).all()
        unit_overrides_dict = {override.unit_code: override.custom_weekly_hours for override in overrides}
        if unit_overrides_dict:
            print(f"Found {len(unit_overrides_dict)} unit overrides: {unit_overrides_dict}")
        
        # Initialize solver
        print("Initializing TimetableSolver...")
        solver = TimetableSolver(
            units=units_input,
            lecturers=lecturers_input,
            venues=venues_input,
            settings=settings_dict,
            unit_overrides=unit_overrides_dict
        )
        
        # Generate timetable
        print("Generating timetable...")
        sessions, conflicts = solver.generate()
        print(f"Generated {len(sessions)} sessions with {len(conflicts)} conflicts")
        
        # Save to database
        print("Saving timetable to database...")
        
        # Get the latest version number for this academic period
        latest_timetable = db.query(Timetable).order_by(Timetable.version.desc()).first()
        next_version = (latest_timetable.version + 1) if latest_timetable else 1
        
        # Create timetable name from settings
        timetable_name = f"{settings.academic_year} Trimester {settings.trimester}"
        
        timetable = Timetable(
            name=timetable_name,
            description="Auto-generated timetable",
            version=next_version,
            is_active=True,
            conflicts=[c for c in conflicts],
            generation_metadata={"generated_by": "OR-Tools Solver", "version": "1.0.0"}
        )
        
        # Deactivate previous timetables
        db.query(Timetable).update({"is_active": False})
        db.add(timetable)
        db.flush()
        print(f"Created timetable with ID: {timetable.id}")
        
        # Save sessions
        print(f"Saving {len(sessions)} sessions...")
        for session_out in sessions:
            # Find database IDs
            unit_db = db.query(Unit).filter(Unit.code == session_out.unit_code).first()
            lecturer_db = db.query(Lecturer).filter(Lecturer.name == session_out.lecturer_name).first()
            venue_db = db.query(Venue).filter(Venue.name == session_out.venue_name).first()
            
            if unit_db and lecturer_db and venue_db:
                db_session = DBSession(
                    timetable_id=timetable.id,
                    unit_id=unit_db.id,
                    lecturer_id=lecturer_db.id,
                    venue_id=venue_db.id,
                    day=session_out.day,
                    start_time=session_out.start_time,
                    end_time=session_out.end_time,
                    session_type=session_out.session_type,
                    program_groups=session_out.program_groups or [],
                    group_name=session_out.group_name
                )
                db.add(db_session)
        
        # Calculate and save statistics
        statistics = {
            "total_sessions": len(sessions),
            "lectures": len([s for s in sessions if s.session_type == "Lecture"]),
            "labs": len([s for s in sessions if s.session_type == "Lab"]),
            "tutorials": len([s for s in sessions if s.session_type == "Tutorial"]),
            "conflicts": len(conflicts),
            "lecturers_utilized": len(set(s.lecturer_name for s in sessions)),
            "venues_utilized": len(set(s.venue_name for s in sessions))
        }
        timetable.statistics = statistics
        
        db.commit()
        print("Timetable saved successfully!")
        
        return TimetableOutput(
            sessions=sessions,
            conflicts=conflicts,
            statistics=statistics,
            metadata={"generated_by": "OR-Tools Solver", "version": "1.0.0", "timetable_id": timetable.id}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in generate_timetable: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# ============= TIMETABLE RETRIEVAL =============

@router.get("/timetable/active")
async def get_active_timetable(db: Session = Depends(get_db)):
    """Get currently active timetable"""
    timetable = db.query(Timetable).filter(Timetable.is_active == True).first()
    
    if not timetable:
        raise HTTPException(status_code=404, detail="No active timetable found")
    
    # Get all sessions
    sessions = db.query(DBSession).filter(DBSession.timetable_id == timetable.id).all()
    
    session_outputs = []
    for s in sessions:
        session_outputs.append(SessionOutput(
            id=str(s.id),
            unit_code=s.unit.code,
            unit_name=s.unit.name,
            lecturer_name=s.lecturer.name,
            venue_name=s.venue.name,
            day=s.day,
            start_time=s.start_time,
            end_time=s.end_time,
            session_type=s.session_type,
            program_groups=s.program_groups or [],
            group_name=s.group_name
        ))
    
    return TimetableOutput(
        sessions=session_outputs,
        conflicts=timetable.conflicts or [],
        statistics=timetable.statistics or {},
        metadata=timetable.generation_metadata or {},
        name=timetable.name,
        version=timetable.version,
        is_active=timetable.is_active
    )

@router.get("/timetable/list")
async def list_timetables(db: Session = Depends(get_db)):
    """List all timetables"""
    timetables = db.query(Timetable).order_by(Timetable.created_at.desc()).all()
    
    return [{
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "version": t.version,
        "is_active": t.is_active,
        "statistics": t.statistics,
        "conflicts": t.conflicts or [],
        "created_at": t.created_at.isoformat()
    } for t in timetables]

@router.post("/timetable/{timetable_id}/activate")
async def activate_timetable(timetable_id: int, db: Session = Depends(get_db)):
    """Activate a specific timetable"""
    timetable = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    # Deactivate all others
    db.query(Timetable).update({"is_active": False})
    timetable.is_active = True
    db.commit()
    
    return {"success": True, "message": f"Timetable {timetable_id} activated"}

@router.delete("/timetable/{timetable_id}")
async def delete_timetable(timetable_id: int, db: Session = Depends(get_db)):
    """Delete a timetable"""
    timetable = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    db.delete(timetable)
    db.commit()
    
    return {"success": True, "message": f"Timetable {timetable_id} deleted"}

# ============= LECTURER-UNIT ASSIGNMENT =============

@router.post("/assign/lecturer-to-unit")
async def assign_lecturer_to_unit(
    unit_code: str,
    lecturer_name: str,
    is_primary: bool = True,
    db: Session = Depends(get_db)
):
    """Assign a lecturer to a unit"""
    unit = db.query(Unit).filter(Unit.code == unit_code).first()
    lecturer = db.query(Lecturer).filter(Lecturer.name == lecturer_name).first()
    
    if not unit or not lecturer:
        raise HTTPException(status_code=404, detail="Unit or Lecturer not found")
    
    # Check if already assigned
    if lecturer not in unit.lecturers:
        unit.lecturers.append(lecturer)
        db.commit()
    
    return {"success": True, "message": f"{lecturer_name} assigned to {unit_code}"}

@router.get("/units/{unit_code}/lecturers")
async def get_unit_lecturers(unit_code: str, db: Session = Depends(get_db)):
    """Get all lecturers assigned to a unit"""
    unit = db.query(Unit).filter(Unit.code == unit_code).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    return [{
        "id": str(l.id),
        "name": l.name,
        "department": l.department
    } for l in unit.lecturers]

# ============= UTILITY ENDPOINTS =============

@router.delete("/clear")
async def clear_all_data(db: Session = Depends(get_db)):
    """Clear all data from database (use with caution!)"""
    try:
        db.query(DBSession).delete()
        db.query(Timetable).delete()
        db.execute(unit_lecturer_assignment.delete())
        db.query(Unit).delete()
        db.query(Lecturer).delete()
        db.query(Venue).delete()
        db.commit()
        
        return {"success": True, "message": "All data cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============= SETTINGS ENDPOINTS =============

def get_or_create_settings(db: Session) -> Settings:
    """Get existing settings or create default settings"""
    settings = db.query(Settings).first()
    if not settings:
        # Create default settings
        settings = Settings(
            academic_year="2024/2025",
            trimester="1",
            schedule_start_time="08:00",
            schedule_end_time="18:00",
            session_duration=60,
            break_duration=15,
            institutional_events=[
                {"name": "Monday Devotion", "day": "Monday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                {"name": "Thursday Devotion", "day": "Thursday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                {"name": "Wednesday Sports", "day": "Wednesday", "start_time": "16:00", "end_time": "18:00", "enabled": True, "color": "orange"}
            ],
            enable_conflict_notifications=True,
            enable_generation_notifications=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    # Ensure institutional_events is never None
    if settings.institutional_events is None:
        settings.institutional_events = [
            {"name": "Monday Devotion", "day": "Monday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
            {"name": "Thursday Devotion", "day": "Thursday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
            {"name": "Wednesday Sports", "day": "Wednesday", "start_time": "16:00", "end_time": "18:00", "enabled": True, "color": "orange"}
        ]
        db.commit()
        db.refresh(settings)
    
    # Ensure time allocation fields have defaults for backward compatibility
    if settings.semester_weeks is None:
        settings.semester_weeks = 14
    if settings.total_hours_per_unit is None:
        settings.total_hours_per_unit = 42
    if settings.allowed_patterns is None:
        settings.allowed_patterns = [
            {"pattern": [3], "label": "3 hours straight"},
            {"pattern": [2, 1], "label": "2 hours + 1 hour"},
            {"pattern": [1, 2], "label": "1 hour + 2 hours"}
        ]
    if settings.prefer_three_hour_blocks is None:
        settings.prefer_three_hour_blocks = True
    if settings.allow_split_blocks is None:
        settings.allow_split_blocks = True
    
    return settings

@router.get("/settings", response_model=SettingsOutput)
async def get_settings(db: Session = Depends(get_db)):
    """Get current settings"""
    settings = get_or_create_settings(db)
    return SettingsOutput(
        id=settings.id,
        academic_year=settings.academic_year,
        trimester=settings.trimester,
        schedule_start_time=settings.schedule_start_time,
        schedule_end_time=settings.schedule_end_time,
        session_duration=settings.session_duration,
        break_duration=settings.break_duration,
        institutional_events=settings.institutional_events if settings.institutional_events else [],
        semester_weeks=settings.semester_weeks,
        total_hours_per_unit=settings.total_hours_per_unit,
        allowed_patterns=settings.allowed_patterns if settings.allowed_patterns else [],
        prefer_three_hour_blocks=settings.prefer_three_hour_blocks,
        allow_split_blocks=settings.allow_split_blocks,
        respect_lecturer_availability=settings.respect_lecturer_availability if hasattr(settings, 'respect_lecturer_availability') else False,
        balance_daily_load=settings.balance_daily_load if hasattr(settings, 'balance_daily_load') else True,
        max_lecturer_hours_per_week=settings.max_lecturer_hours_per_week if hasattr(settings, 'max_lecturer_hours_per_week') else 20,
        enable_conflict_notifications=settings.enable_conflict_notifications,
        enable_generation_notifications=settings.enable_generation_notifications,
        created_at=settings.created_at.isoformat(),
        updated_at=settings.updated_at.isoformat()
    )

@router.put("/settings", response_model=SettingsOutput)
async def update_settings(settings_input: SettingsInput, db: Session = Depends(get_db)):
    """Update settings"""
    try:
        settings = get_or_create_settings(db)
        
        # Update all fields
        settings.academic_year = settings_input.academic_year
        settings.trimester = settings_input.trimester
        settings.schedule_start_time = settings_input.schedule_start_time
        settings.schedule_end_time = settings_input.schedule_end_time
        settings.session_duration = settings_input.session_duration
        settings.break_duration = settings_input.break_duration
        settings.institutional_events = settings_input.institutional_events
        settings.semester_weeks = settings_input.semester_weeks
        settings.total_hours_per_unit = settings_input.total_hours_per_unit
        settings.allowed_patterns = [p.dict() if hasattr(p, 'dict') else p for p in settings_input.allowed_patterns]
        settings.prefer_three_hour_blocks = settings_input.prefer_three_hour_blocks
        settings.allow_split_blocks = settings_input.allow_split_blocks
        
        # Update constraint settings
        if hasattr(settings_input, 'respect_lecturer_availability'):
            settings.respect_lecturer_availability = settings_input.respect_lecturer_availability
        if hasattr(settings_input, 'balance_daily_load'):
            settings.balance_daily_load = settings_input.balance_daily_load
        if hasattr(settings_input, 'max_lecturer_hours_per_week'):
            settings.max_lecturer_hours_per_week = settings_input.max_lecturer_hours_per_week
        
        settings.enable_conflict_notifications = settings_input.enable_conflict_notifications
        settings.enable_generation_notifications = settings_input.enable_generation_notifications
        settings.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(settings)
        
        return SettingsOutput(
            id=settings.id,
            academic_year=settings.academic_year,
            trimester=settings.trimester,
            schedule_start_time=settings.schedule_start_time,
            schedule_end_time=settings.schedule_end_time,
            session_duration=settings.session_duration,
            break_duration=settings.break_duration,
            institutional_events=settings.institutional_events if settings.institutional_events else [],
            semester_weeks=settings.semester_weeks,
            total_hours_per_unit=settings.total_hours_per_unit,
            allowed_patterns=settings.allowed_patterns if settings.allowed_patterns else [],
            prefer_three_hour_blocks=settings.prefer_three_hour_blocks,
            allow_split_blocks=settings.allow_split_blocks,
            respect_lecturer_availability=settings.respect_lecturer_availability if hasattr(settings, 'respect_lecturer_availability') else False,
            balance_daily_load=settings.balance_daily_load if hasattr(settings, 'balance_daily_load') else True,
            max_lecturer_hours_per_week=settings.max_lecturer_hours_per_week if hasattr(settings, 'max_lecturer_hours_per_week') else 20,
            enable_conflict_notifications=settings.enable_conflict_notifications,
            enable_generation_notifications=settings.enable_generation_notifications,
            created_at=settings.created_at.isoformat(),
            updated_at=settings.updated_at.isoformat()
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

# ============= UNIT WEEKLY OVERRIDE ENDPOINTS =============

@router.get("/unit-overrides", response_model=List[UnitWeeklyOverrideResponse])
async def get_all_unit_overrides(db: Session = Depends(get_db)):
    """Get all unit weekly hour overrides"""
    overrides = db.query(UnitWeeklyOverride).all()
    return [
        UnitWeeklyOverrideResponse(
            id=override.id,
            unit_code=override.unit_code,
            custom_weekly_hours=override.custom_weekly_hours,
            notes=override.notes,
            created_at=override.created_at.isoformat(),
            updated_at=override.updated_at.isoformat()
        )
        for override in overrides
    ]

@router.post("/unit-overrides", response_model=UnitWeeklyOverrideResponse)
async def create_unit_override(override_input: UnitWeeklyOverrideCreate, db: Session = Depends(get_db)):
    """Create or update a unit weekly hour override"""
    try:
        # Verify unit exists
        unit = db.query(Unit).filter(Unit.code == override_input.unit_code).first()
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {override_input.unit_code} not found")
        
        # Check if override already exists
        existing = db.query(UnitWeeklyOverride).filter(
            UnitWeeklyOverride.unit_code == override_input.unit_code
        ).first()
        
        if existing:
            # Update existing override
            existing.custom_weekly_hours = override_input.custom_weekly_hours
            existing.notes = override_input.notes
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            override = existing
        else:
            # Create new override
            override = UnitWeeklyOverride(
                unit_code=override_input.unit_code,
                custom_weekly_hours=override_input.custom_weekly_hours,
                notes=override_input.notes
            )
            db.add(override)
            db.commit()
            db.refresh(override)
        
        return UnitWeeklyOverrideResponse(
            id=override.id,
            unit_code=override.unit_code,
            custom_weekly_hours=override.custom_weekly_hours,
            notes=override.notes,
            created_at=override.created_at.isoformat(),
            updated_at=override.updated_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create/update override: {str(e)}")

@router.delete("/unit-overrides/{unit_code}")
async def delete_unit_override(unit_code: str, db: Session = Depends(get_db)):
    """Delete a unit weekly hour override"""
    try:
        unit_code = unit_code.upper()
        override = db.query(UnitWeeklyOverride).filter(
            UnitWeeklyOverride.unit_code == unit_code
        ).first()
        
        if not override:
            raise HTTPException(status_code=404, detail=f"No override found for unit {unit_code}")
        
        db.delete(override)
        db.commit()
        
        return {"success": True, "message": f"Override for {unit_code} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete override: {str(e)}")

@router.get("/units/with-overrides", response_model=List[UnitWithOverrideInfo])
async def get_units_with_override_info(db: Session = Depends(get_db)):
    """Get all units with their override information and calculated weekly hours"""
    try:
        settings = get_or_create_settings(db)
        
        # Calculate global weekly hours from settings
        global_weekly_hours = settings.total_hours_per_unit // settings.semester_weeks if settings.semester_weeks > 0 else 3
        
        # Get all units
        units = db.query(Unit).all()
        
        # Get all overrides as a dictionary for quick lookup
        overrides_dict = {
            override.unit_code: override
            for override in db.query(UnitWeeklyOverride).all()
        }
        
        # Build response
        result = []
        for unit in units:
            override = overrides_dict.get(unit.code)
            has_override = override is not None
            override_weekly_hours = override.custom_weekly_hours if has_override else None
            effective_weekly_hours = override_weekly_hours if has_override else global_weekly_hours
            
            result.append(UnitWithOverrideInfo(
                code=unit.code,
                name=unit.name,
                global_weekly_hours=global_weekly_hours,
                has_override=has_override,
                override_weekly_hours=override_weekly_hours,
                effective_weekly_hours=effective_weekly_hours,
                override_notes=override.notes if has_override else None
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch units with overrides: {str(e)}")

