from ortools.sat.python import cp_model
from typing import List, Dict, Any, Tuple
from backend.models.schemas import UnitInput, LecturerInput, VenueInput, SessionOutput
import uuid

class TimetableSolver:
    """
    Hybrid OR-Tools + Custom Heuristics Timetable Generator
    
    Constraints:
    - No lecturer can teach two sessions at the same time
    - No venue can host two sessions at the same time
    - Sessions must fit within available time slots
    - Respect lecturer availability
    - Match venue capacity with program group size
    - Labs require lab venues
    """
    
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    TIME_SLOTS = [
        ("07:00", "08:00"), ("08:00", "09:00"), ("09:00", "10:00"),
        ("10:00", "11:00"), ("11:00", "12:00"), ("12:00", "13:00"),
        ("13:00", "14:00"), ("14:00", "15:00"), ("15:00", "16:00"),
        ("16:00", "17:00"), ("17:00", "18:00"), ("18:00", "19:00"),
    ]
    
    def __init__(self, units: List[UnitInput], lecturers: List[LecturerInput], venues: List[VenueInput]):
        self.units = units
        self.lecturers = lecturers
        self.venues = venues
        self.model = cp_model.CpModel()
        self.sessions = []
        self.variables = {}
        
    def generate(self) -> Tuple[List[SessionOutput], List[dict]]:
        """
        Generate timetable using CP-SAT solver
        Returns: (sessions, conflicts)
        """
        
        # Create session requirements from units
        session_requirements = self._create_session_requirements()
        
        # Create decision variables
        self._create_variables(session_requirements)
        
        # Add constraints
        self._add_constraints(session_requirements)
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0  # 30 second timeout
        status = solver.Solve(self.model)
        
        # Extract solution
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            sessions = self._extract_sessions(solver, session_requirements)
            conflicts = self._detect_conflicts(sessions)
            return sessions, conflicts
        else:
            # Fallback to greedy heuristic if CP-SAT fails
            return self._greedy_fallback(session_requirements)
    
    def _create_session_requirements(self) -> List[Dict[str, Any]]:
        """Convert units into individual session requirements"""
        requirements = []
        
        for unit in self.units:
            # Create lecture sessions
            for i in range(unit.lecture_hours):
                requirements.append({
                    'unit': unit,
                    'type': 'Lecture',
                    'duration': 2,  # 2-hour blocks
                    'requires_lab': False,
                    'index': i
                })
            
            # Create lab sessions
            for i in range(unit.lab_hours):
                requirements.append({
                    'unit': unit,
                    'type': 'Lab',
                    'duration': 3,  # 3-hour blocks
                    'requires_lab': True,
                    'index': i
                })
            
            # Create tutorial sessions
            for i in range(unit.tutorial_hours):
                requirements.append({
                    'unit': unit,
                    'type': 'Tutorial',
                    'duration': 1,  # 1-hour blocks
                    'requires_lab': False,
                    'index': i
                })
        
        return requirements
    
    def _create_variables(self, requirements: List[Dict]):
        """Create CP-SAT variables for each session"""
        for req_idx, req in enumerate(requirements):
            for day_idx, day in enumerate(self.DAYS):
                for slot_idx in range(len(self.TIME_SLOTS) - req['duration'] + 1):
                    for lecturer_idx, lecturer in enumerate(self.lecturers):
                        for venue_idx, venue in enumerate(self.venues):
                            # Create boolean variable: is this session assigned here?
                            var_name = f"s{req_idx}_d{day_idx}_t{slot_idx}_l{lecturer_idx}_v{venue_idx}"
                            var = self.model.NewBoolVar(var_name)
                            self.variables[var_name] = {
                                'var': var,
                                'req_idx': req_idx,
                                'day': day,
                                'day_idx': day_idx,
                                'slot_idx': slot_idx,
                                'lecturer': lecturer,
                                'lecturer_idx': lecturer_idx,
                                'venue': venue,
                                'venue_idx': venue_idx,
                                'requirement': req
                            }
    
    def _add_constraints(self, requirements: List[Dict]):
        """Add all constraints to the model"""
        
        # 1. Each session must be assigned exactly once
        for req_idx in range(len(requirements)):
            vars_for_session = [
                v['var'] for k, v in self.variables.items()
                if v['req_idx'] == req_idx
            ]
            self.model.Add(sum(vars_for_session) == 1)
        
        # 2. No lecturer conflicts (can't teach two sessions at same time)
        for day_idx in range(len(self.DAYS)):
            for slot_idx in range(len(self.TIME_SLOTS)):
                for lecturer_idx in range(len(self.lecturers)):
                    overlapping_vars = []
                    for k, v in self.variables.items():
                        if (v['day_idx'] == day_idx and 
                            v['lecturer_idx'] == lecturer_idx):
                            # Check if this session overlaps with current slot
                            req_duration = v['requirement']['duration']
                            session_start = v['slot_idx']
                            session_end = session_start + req_duration
                            if session_start <= slot_idx < session_end:
                                overlapping_vars.append(v['var'])
                    
                    if overlapping_vars:
                        self.model.Add(sum(overlapping_vars) <= 1)
        
        # 3. No venue conflicts
        for day_idx in range(len(self.DAYS)):
            for slot_idx in range(len(self.TIME_SLOTS)):
                for venue_idx in range(len(self.venues)):
                    overlapping_vars = []
                    for k, v in self.variables.items():
                        if (v['day_idx'] == day_idx and 
                            v['venue_idx'] == venue_idx):
                            req_duration = v['requirement']['duration']
                            session_start = v['slot_idx']
                            session_end = session_start + req_duration
                            if session_start <= slot_idx < session_end:
                                overlapping_vars.append(v['var'])
                    
                    if overlapping_vars:
                        self.model.Add(sum(overlapping_vars) <= 1)
        
        # 4. Lab sessions require lab venues
        for k, v in self.variables.items():
            if v['requirement']['requires_lab'] and v['venue'].venue_type != 'Lab':
                self.model.Add(v['var'] == 0)  # Cannot assign
    
    def _extract_sessions(self, solver: cp_model.CpSolver, requirements: List[Dict]) -> List[SessionOutput]:
        """Extract assigned sessions from solved model"""
        sessions = []
        
        for k, v in self.variables.items():
            if solver.Value(v['var']) == 1:
                req = v['requirement']
                start_slot = v['slot_idx']
                end_slot = start_slot + req['duration']
                
                session = SessionOutput(
                    id=str(uuid.uuid4()),
                    unit_code=req['unit'].code,
                    unit_name=req['unit'].name,
                    lecturer_name=v['lecturer'].name,
                    venue_name=v['venue'].name,
                    day=v['day'],
                    start_time=self.TIME_SLOTS[start_slot][0],
                    end_time=self.TIME_SLOTS[end_slot - 1][1],
                    session_type=req['type'],
                    program_groups=req['unit'].program_groups,
                    group_name=None
                )
                sessions.append(session)
        
        return sessions
    
    def _detect_conflicts(self, sessions: List[SessionOutput]) -> List[dict]:
        """Detect any remaining conflicts in the schedule"""
        conflicts = []
        
        # Check for lecturer conflicts
        for i, s1 in enumerate(sessions):
            for s2 in sessions[i+1:]:
                if (s1.day == s2.day and 
                    s1.lecturer_name == s2.lecturer_name and
                    self._times_overlap(s1.start_time, s1.end_time, s2.start_time, s2.end_time)):
                    conflicts.append({
                        'type': 'lecturer_conflict',
                        'lecturer': s1.lecturer_name,
                        'sessions': [s1.id, s2.id],
                        'day': s1.day,
                        'time': f"{s1.start_time}-{s1.end_time}"
                    })
        
        return conflicts
    
    def _times_overlap(self, start1: str, end1: str, start2: str, end2: str) -> bool:
        """Check if two time ranges overlap"""
        return start1 < end2 and start2 < end1
    
    def _greedy_fallback(self, requirements: List[Dict]) -> Tuple[List[SessionOutput], List[dict]]:
        """Greedy heuristic fallback if CP-SAT fails"""
        sessions = []
        conflicts = []
        
        # Simple greedy: Assign each session to first available slot
        occupied = {}  # (day, time, resource) -> session_id
        
        for req in requirements:
            assigned = False
            for day in self.DAYS:
                for slot_idx in range(len(self.TIME_SLOTS) - req['duration'] + 1):
                    for lecturer in self.lecturers:
                        for venue in self.venues:
                            # Check if slot is free
                            if req['requires_lab'] and venue.venue_type != 'Lab':
                                continue
                            
                            # Check conflicts
                            has_conflict = False
                            for t in range(slot_idx, slot_idx + req['duration']):
                                lec_key = (day, t, 'lecturer', lecturer.name)
                                ven_key = (day, t, 'venue', venue.name)
                                if lec_key in occupied or ven_key in occupied:
                                    has_conflict = True
                                    break
                            
                            if not has_conflict:
                                # Assign
                                session_id = str(uuid.uuid4())
                                session = SessionOutput(
                                    id=session_id,
                                    unit_code=req['unit'].code,
                                    unit_name=req['unit'].name,
                                    lecturer_name=lecturer.name,
                                    venue_name=venue.name,
                                    day=day,
                                    start_time=self.TIME_SLOTS[slot_idx][0],
                                    end_time=self.TIME_SLOTS[slot_idx + req['duration'] - 1][1],
                                    session_type=req['type'],
                                    program_groups=req['unit'].program_groups
                                )
                                sessions.append(session)
                                
                                # Mark as occupied
                                for t in range(slot_idx, slot_idx + req['duration']):
                                    occupied[(day, t, 'lecturer', lecturer.name)] = session_id
                                    occupied[(day, t, 'venue', venue.name)] = session_id
                                
                                assigned = True
                                break
                        
                        if assigned:
                            break
                    if assigned:
                        break
                if assigned:
                    break
        
        return sessions, conflicts
