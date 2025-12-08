import pandas as pd
from io import BytesIO
from typing import List, Dict, Any
from backend.models.schemas import UnitInput, LecturerInput, VenueInput

class FileParser:
    """Parse uploaded CSV/XLSX files for timetable generation"""
    
    @staticmethod
    async def parse_units_file(file_content: bytes, file_extension: str) -> List[UnitInput]:
        """Parse units from uploaded file"""
        try:
            if file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(BytesIO(file_content))
            elif file_extension == '.csv':
                df = pd.read_csv(BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Expected columns: code, name, credit_hours, lecture_hours, lab_hours, tutorial_hours, program_groups
            units = []
            for _, row in df.iterrows():
                # Parse program_groups (might be comma-separated)
                program_groups = str(row.get('program_groups', '')).split(',')
                program_groups = [p.strip() for p in program_groups if p.strip()]
                
                unit = UnitInput(
                    code=str(row['code']),
                    name=str(row['name']),
                    credit_hours=int(row.get('credit_hours', 3)),
                    lecture_hours=int(row.get('lecture_hours', 2)),
                    lab_hours=int(row.get('lab_hours', 0)),
                    tutorial_hours=int(row.get('tutorial_hours', 0)),
                    program_groups=program_groups
                )
                units.append(unit)
            
            return units
        except Exception as e:
            raise ValueError(f"Error parsing units file: {str(e)}")
    
    @staticmethod
    async def parse_lecturers_file(file_content: bytes, file_extension: str) -> List[LecturerInput]:
        """Parse lecturers from uploaded file"""
        try:
            if file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(BytesIO(file_content))
            elif file_extension == '.csv':
                df = pd.read_csv(BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            lecturers = []
            for _, row in df.iterrows():
                availability = None
                if 'availability' in row and pd.notna(row['availability']):
                    availability = str(row['availability']).split(',')
                    availability = [a.strip() for a in availability]
                
                lecturer = LecturerInput(
                    name=str(row['name']),
                    department=str(row.get('department', 'General')),
                    email=str(row['email']) if 'email' in row and pd.notna(row['email']) else None,
                    max_hours_per_week=int(row.get('max_hours_per_week', 20)),
                    availability=availability
                )
                lecturers.append(lecturer)
            
            return lecturers
        except Exception as e:
            raise ValueError(f"Error parsing lecturers file: {str(e)}")
    
    @staticmethod
    async def parse_venues_file(file_content: bytes, file_extension: str) -> List[VenueInput]:
        """Parse venues from uploaded file"""
        try:
            if file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(BytesIO(file_content))
            elif file_extension == '.csv':
                df = pd.read_csv(BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            venues = []
            for _, row in df.iterrows():
                equipment = []
                if 'equipment' in row and pd.notna(row['equipment']):
                    equipment = str(row['equipment']).split(',')
                    equipment = [e.strip() for e in equipment]
                
                venue_type = str(row.get('type', 'Classroom'))
                if venue_type not in ["Lecture Hall", "Lab", "Classroom", "Seminar Room"]:
                    venue_type = "Classroom"
                
                venue = VenueInput(
                    name=str(row['name']),
                    capacity=int(row['capacity']),
                    venue_type=venue_type,
                    equipment=equipment
                )
                venues.append(venue)
            
            return venues
        except Exception as e:
            raise ValueError(f"Error parsing venues file: {str(e)}")
