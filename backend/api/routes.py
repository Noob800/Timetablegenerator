from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
from services.file_parser import FileParser
from services.timetable_solver import TimetableSolver
from models.schemas import (
    TimetableGenerationRequest,
    TimetableOutput,
    UnitInput,
    LecturerInput,
    VenueInput
)

router = APIRouter(prefix="/api", tags=["timetable"])

# In-memory storage for uploaded data (replace with database in production)
uploaded_data = {
    "units": [],
    "lecturers": [],
    "venues": []
}

@router.post("/upload/units")
async def upload_units(file: UploadFile = File(...)):
    """Upload units CSV/XLSX file"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        units = await parser.parse_units_file(content, file_ext)
        
        uploaded_data["units"] = units
        
        return {
            "success": True,
            "message": f"Uploaded {len(units)} units successfully",
            "count": len(units),
            "preview": [u.dict() for u in units[:5]]  # First 5 for preview
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/lecturers")
async def upload_lecturers(file: UploadFile = File(...)):
    """Upload lecturers CSV/XLSX file"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        lecturers = await parser.parse_lecturers_file(content, file_ext)
        
        uploaded_data["lecturers"] = lecturers
        
        return {
            "success": True,
            "message": f"Uploaded {len(lecturers)} lecturers successfully",
            "count": len(lecturers),
            "preview": [l.dict() for l in lecturers[:5]]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/venues")
async def upload_venues(file: UploadFile = File(...)):
    """Upload venues CSV/XLSX file"""
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        parser = FileParser()
        venues = await parser.parse_venues_file(content, file_ext)
        
        uploaded_data["venues"] = venues
        
        return {
            "success": True,
            "message": f"Uploaded {len(venues)} venues successfully",
            "count": len(venues),
            "preview": [v.dict() for v in venues[:5]]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/upload/status")
async def get_upload_status():
    """Check what data has been uploaded"""
    return {
        "units": len(uploaded_data["units"]),
        "lecturers": len(uploaded_data["lecturers"]),
        "venues": len(uploaded_data["venues"]),
        "ready": all([
            uploaded_data["units"],
            uploaded_data["lecturers"],
            uploaded_data["venues"]
        ])
    }

@router.post("/generate", response_model=TimetableOutput)
async def generate_timetable():
    """Generate timetable using uploaded data"""
    try:
        # Validate uploaded data
        if not all([uploaded_data["units"], uploaded_data["lecturers"], uploaded_data["venues"]]):
            raise HTTPException(
                status_code=400,
                detail="Please upload all required files (units, lecturers, venues) before generating"
            )
        
        # Initialize solver
        solver = TimetableSolver(
            units=uploaded_data["units"],
            lecturers=uploaded_data["lecturers"],
            venues=uploaded_data["venues"]
        )
        
        # Generate timetable
        sessions, conflicts = solver.generate()
        
        # Calculate statistics
        statistics = {
            "total_sessions": len(sessions),
            "lectures": len([s for s in sessions if s.session_type == "Lecture"]),
            "labs": len([s for s in sessions if s.session_type == "Lab"]),
            "tutorials": len([s for s in sessions if s.session_type == "Tutorial"]),
            "conflicts": len(conflicts),
            "lecturers_utilized": len(set(s.lecturer_name for s in sessions)),
            "venues_utilized": len(set(s.venue_name for s in sessions))
        }
        
        return TimetableOutput(
            sessions=sessions,
            conflicts=conflicts,
            statistics=statistics,
            metadata={
                "generated_by": "OR-Tools CP-SAT Solver",
                "version": "1.0.0"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/generate/custom", response_model=TimetableOutput)
async def generate_custom_timetable(request: TimetableGenerationRequest):
    """Generate timetable with custom data (no file upload required)"""
    try:
        solver = TimetableSolver(
            units=request.units,
            lecturers=request.lecturers,
            venues=request.venues
        )
        
        sessions, conflicts = solver.generate()
        
        statistics = {
            "total_sessions": len(sessions),
            "lectures": len([s for s in sessions if s.session_type == "Lecture"]),
            "labs": len([s for s in sessions if s.session_type == "Lab"]),
            "tutorials": len([s for s in sessions if s.session_type == "Tutorial"]),
            "conflicts": len(conflicts)
        }
        
        return TimetableOutput(
            sessions=sessions,
            conflicts=conflicts,
            statistics=statistics,
            metadata={"generated_by": "OR-Tools CP-SAT Solver", "version": "1.0.0"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.delete("/clear")
async def clear_uploaded_data():
    """Clear all uploaded data"""
    uploaded_data["units"] = []
    uploaded_data["lecturers"] = []
    uploaded_data["venues"] = []
    
    return {"success": True, "message": "All uploaded data cleared"}
