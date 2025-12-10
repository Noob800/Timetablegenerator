from ortools.sat.python import cp_model
from typing import List, Dict, Any, Tuple, Optional
from models.schemas import UnitInput, LecturerInput, VenueInput, SessionOutput
import uuid
from collections import defaultdict

class TimetableSolver:
    """
    OR-Tools CP-SAT Constraint Programming Timetable Generator
    
    Hard Constraints:
    - No lecturer can teach two sessions at the same time
    - No venue can host two sessions at the same time
    - Sessions must fit within available time slots
    - Respect lecturer availability
    - Match venue capacity with program group size
    - Labs require lab venues, lectures prefer lecture halls
    - Respect institutional events (devotion, sports)
    
    Soft Constraints (optimized):
    - Minimize gaps in lecturer schedules
    - Distribute sessions evenly across the week
    - Prefer morning slots for lectures
    - Minimize consecutive teaching hours for lecturers
    """
    
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    def __init__(
        self, 
        units: List[UnitInput], 
        lecturers: List[LecturerInput], 
        venues: List[VenueInput],
        settings: Optional[Dict[str, Any]] = None,
        unit_overrides: Optional[Dict[str, int]] = None
    ):
        self.units = units
        self.lecturers = lecturers
        self.venues = venues
        self.settings = settings or self._default_settings()
        self.unit_overrides = unit_overrides or {}  # Dictionary mapping unit_code -> custom_weekly_hours
        self.model = cp_model.CpModel()
        self.sessions = []
        self.variables = {}
        
        # Generate time slots based on settings
        self.TIME_SLOTS = self._generate_time_slots()
        self.TIME_PREFERENCES = self._generate_time_preferences()
        self.BLOCKED_SLOTS = self._generate_blocked_slots()
    
    def _default_settings(self) -> Dict[str, Any]:
        """Default settings if none provided"""
        return {
            'schedule_start_time': '08:00',
            'schedule_end_time': '18:00',
            'session_duration': 60,
            'institutional_events': [
                {"name": "Monday Devotion", "day": "Monday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                {"name": "Thursday Devotion", "day": "Thursday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                {"name": "Wednesday Sports", "day": "Wednesday", "start_time": "16:00", "end_time": "18:00", "enabled": True, "color": "orange"}
            ]
        }
    
    def _generate_time_slots(self) -> List[Tuple[str, str]]:
        """Generate time slots based on settings"""
        start_time = self.settings.get('schedule_start_time', '08:00')
        end_time = self.settings.get('schedule_end_time', '18:00')
        
        # For now, keep standard 1-hour slots
        # This can be enhanced to use session_duration from settings
        slots = []
        start_hour = int(start_time.split(':')[0])
        end_hour = int(end_time.split(':')[0])
        
        for hour in range(start_hour, end_hour):
            slots.append((f"{hour:02d}:00", f"{hour+1:02d}:00"))
        
        return slots
    
    def _generate_time_preferences(self) -> Dict[int, int]:
        """Generate time preferences (morning slots preferred)"""
        prefs = {}
        total_slots = len(self.TIME_SLOTS)
        for i in range(total_slots):
            # Higher score for morning slots
            if i < total_slots // 3:
                prefs[i] = 20  # Morning
            elif i < 2 * total_slots // 3:
                prefs[i] = 10  # Midday
            else:
                prefs[i] = 5   # Afternoon
        return prefs
    
    def _generate_blocked_slots(self) -> Dict[str, List[Tuple[str, str]]]:
        """Generate blocked time slots for institutional events"""
        blocked = {}
        
        # Process dynamic institutional events
        institutional_events = self.settings.get('institutional_events', [])
        for event in institutional_events:
            if not event.get('enabled', False):
                continue
            
            day = event.get('day')
            start_time = event.get('start_time')
            end_time = event.get('end_time')
            
            if day and start_time and end_time:
                if day not in blocked:
                    blocked[day] = []
                blocked[day].append((start_time, end_time))
        
        return blocked
    
    def _is_slot_blocked(self, day: str, slot: Tuple[str, str]) -> bool:
        """Check if a time slot is blocked by institutional events"""
        if day not in self.BLOCKED_SLOTS:
            return False
        
        slot_start, slot_end = slot
        for blocked_start, blocked_end in self.BLOCKED_SLOTS[day]:
            # Check if slot overlaps with blocked time
            if slot_start < blocked_end and slot_end > blocked_start:
                return True
        return False
    
    def _get_weekly_hours_for_unit(self, unit_code: str) -> int:
        """
        Get weekly teaching hours for a unit.
        Priority: 1) Unit-specific override, 2) Global calculation from settings
        
        For backward compatibility, if settings are missing time allocation fields,
        defaults to 3 hours per week (42 total hours / 14 weeks).
        """
        # Check for unit-specific override first
        if unit_code in self.unit_overrides:
            return self.unit_overrides[unit_code]
        
        # Calculate from global settings
        semester_weeks = self.settings.get('semester_weeks', 14)
        total_hours = self.settings.get('total_hours_per_unit', 42)
        
        if semester_weeks <= 0:
            semester_weeks = 14  # Safety fallback
        
        weekly_hours = total_hours // semester_weeks
        return max(1, weekly_hours)  # Ensure at least 1 hour
    
    def _select_pattern_for_weekly_hours(self, weekly_hours: int, unit_code: str = "") -> List[int]:
        """
        Select a valid time-block pattern for the given weekly hours.
        Respects preferences: prefer_three_hour_blocks, allow_split_blocks
        
        Returns a pattern like [3] for 3-hour block, [2, 1] for 2+1 split, etc.
        """
        allowed_patterns = self.settings.get('allowed_patterns', [
            {"pattern": [3], "label": "3 hours straight"},
            {"pattern": [2, 1], "label": "2 hours + 1 hour"},
            {"pattern": [1, 2], "label": "1 hour + 2 hours"}
        ])
        
        prefer_three_hour = self.settings.get('prefer_three_hour_blocks', True)
        allow_split = self.settings.get('allow_split_blocks', True)
        
        # Filter patterns based on preferences
        valid_patterns = []
        for p in allowed_patterns:
            pattern = p.get('pattern', p) if isinstance(p, dict) else p
            if isinstance(pattern, dict):
                pattern = pattern.get('pattern', [])
            
            pattern_sum = sum(pattern)
            
            # Check if pattern matches weekly hours
            if pattern_sum != weekly_hours:
                continue
            
            # Check if split blocks are allowed
            if len(pattern) > 1 and not allow_split:
                continue
            
            valid_patterns.append(pattern)
        
        if not valid_patterns:
            # Fallback: generate simple pattern
            print(f"WARNING: No valid pattern found for {weekly_hours} hours for unit {unit_code}. Using fallback.")
            if weekly_hours >= 3:
                return [3] if weekly_hours == 3 else [3] * (weekly_hours // 3) + ([weekly_hours % 3] if weekly_hours % 3 > 0 else [])
            else:
                return [weekly_hours]
        
        # Pattern selection strategy:
        # If prefer_three_hour is True, we still want SOME variety, not ALL [3]
        # Use a rotation strategy: distribute patterns to avoid monotony
        if prefer_three_hour and len(valid_patterns) > 1:
            # Prefer patterns with 3-hour blocks BUT allow split patterns for variety
            # Use unit_code hash to deterministically vary patterns
            unit_hash = hash(unit_code) if unit_code else 0
            
            # 70% get single block, 30% get split patterns (for variety)
            if unit_hash % 10 < 7:
                # Prefer single blocks
                single_blocks = [p for p in valid_patterns if len(p) == 1]
                if single_blocks:
                    selected_pattern = single_blocks[0]
                else:
                    selected_pattern = valid_patterns[0]
            else:
                # Use split pattern for variety
                split_blocks = [p for p in valid_patterns if len(p) > 1]
                if split_blocks:
                    selected_pattern = split_blocks[unit_hash % len(split_blocks)]
                else:
                    selected_pattern = valid_patterns[0]
        else:
            # No preference or only one valid pattern
            selected_pattern = valid_patterns[0]
        
        # Debug logging for all pattern selections
        if unit_code:
            if len(valid_patterns) > 1:
                print(f"  {unit_code}: Selected pattern {selected_pattern} from {valid_patterns}")
        
        return selected_pattern
    
    def _pattern_to_sessions(self, pattern: List[int], unit: UnitInput, session_type: str = 'Lecture') -> List[Dict[str, Any]]:
        """
        Convert a time-block pattern into session requirements.
        
        Args:
            pattern: List of hour blocks, e.g., [3] or [2, 1]
            unit: The unit these sessions belong to
            session_type: Type of session (Lecture, Lab, Tutorial)
        
        Returns: List of session requirement dicts
        """
        requirements = []
        for i, duration in enumerate(pattern):
            req = {
                'unit': unit,
                'type': session_type,
                'duration': duration,
                'requires_lab': session_type == 'Lab',
                'index': i,
                'pattern': pattern,  # Store full pattern for context
                'block_index': i  # Which block in the pattern
            }
            requirements.append(req)
        
        # Debug logging for split patterns
        if len(pattern) > 1:
            durations_str = ", ".join([f"{d}h" for d in pattern])
            print(f"    Created {len(requirements)} session requirements for {unit.code}: {durations_str}")
        
        return requirements
        
    def generate(self, use_cp_sat: bool = True, time_limit_seconds: int = 30) -> Tuple[List[SessionOutput], List[dict]]:
        """
        Generate timetable using CP-SAT solver or greedy fallback
        
        Args:
            use_cp_sat: If True, use CP-SAT solver. If False, use greedy algorithm
            time_limit_seconds: Maximum time for CP-SAT solver
            
        Returns: (sessions, conflicts)
        """
        
        # Create session requirements from units
        session_requirements = self._create_session_requirements()
        
        if not session_requirements:
            return [], []
        
        # Use CP-SAT solver if enabled and dataset is reasonable size
        if use_cp_sat and len(session_requirements) < 200:
            try:
                return self._cp_sat_solve(session_requirements, time_limit_seconds)
            except Exception as e:
                print(f"CP-SAT solver failed: {e}, falling back to greedy algorithm")
                return self._greedy_fallback(session_requirements)
        else:
            # Use greedy for large datasets or when CP-SAT is disabled
            return self._greedy_fallback(session_requirements)
    
    def _create_session_requirements(self) -> List[Dict[str, Any]]:
        """
        Convert units into individual session requirements using dynamic time allocation.
        
        This replaces the hardcoded duration approach with a flexible, settings-driven system.
        Each unit's weekly hours are calculated from:
        1. Unit-specific override (if exists), OR
        2. Global formula: total_hours_per_unit / semester_weeks
        
        Then selects an appropriate time-block pattern from allowed_patterns.
        
        CRITICAL: Sessions from split patterns MUST be on different days.
        All weekly hours for each unit MUST be fully assigned.
        """
        requirements = []
        unit_session_groups = {}  # Track which sessions belong to each unit
        
        for unit in self.units:
            # Get weekly hours for this unit (dynamic calculation)
            weekly_hours = self._get_weekly_hours_for_unit(unit.code)
            
            # Select time-block pattern based on weekly hours and preferences
            pattern = self._select_pattern_for_weekly_hours(weekly_hours, unit.code)
            
            # Determine session type based on unit attributes
            # Priority: If unit has lab_hours > 0, create Lab sessions
            # Otherwise, create Lecture sessions
            # Tutorial sessions are additional if tutorial_hours > 0
            
            session_indices = []  # Track session indices for this unit
            
            if unit.lab_hours > 0:
                # This is a lab-based unit - use Lab session type
                lab_sessions = self._pattern_to_sessions(pattern, unit, 'Lab')
                start_idx = len(requirements)
                requirements.extend(lab_sessions)
                session_indices.extend(range(start_idx, len(requirements)))
            else:
                # Regular lecture-based unit
                lecture_sessions = self._pattern_to_sessions(pattern, unit, 'Lecture')
                start_idx = len(requirements)
                requirements.extend(lecture_sessions)
                session_indices.extend(range(start_idx, len(requirements)))
            
            # Store unit session group info for validation
            unit_session_groups[unit.code] = {
                'session_indices': session_indices,
                'pattern': pattern,
                'total_hours': sum(pattern),
                'weekly_hours': weekly_hours,
                'is_split': len(pattern) > 1  # True if pattern has multiple blocks
            }
            
            # Add tutorials if specified (typically 1-hour sessions)
            if unit.tutorial_hours > 0:
                for i in range(unit.tutorial_hours):
                    requirements.append({
                        'unit': unit,
                        'type': 'Tutorial',
                        'duration': 1,
                        'requires_lab': False,
                        'index': i,
                        'pattern': [1],
                        'block_index': 0
                    })
        
        # Store unit groups for constraint validation
        self.unit_session_groups = unit_session_groups
        
        print(f"\n=== SESSION REQUIREMENTS SUMMARY ===")
        print(f"Generated {len(requirements)} session requirements from {len(self.units)} units")
        split_count = sum(1 for g in unit_session_groups.values() if g['is_split'])
        print(f"Split patterns detected: {split_count} units")
        
        # Count requirements by duration
        duration_counts = defaultdict(int)
        for req in requirements:
            duration_counts[req['duration']] += 1
        print(f"Duration breakdown: {dict(duration_counts)}")
        
        # Debug: Show details of split pattern units
        if split_count > 0:
            print(f"\nSplit pattern units (showing first 10):")
            shown = 0
            for unit_code, info in unit_session_groups.items():
                if info['is_split'] and shown < 10:
                    print(f"  {unit_code}: pattern {info['pattern']}, total {info['total_hours']}h, {len(info['pattern'])} sessions")
                    shown += 1
        print("=" * 35 + "\n")
        
        return requirements
    
    def _cp_sat_solve(self, requirements: List[Dict], time_limit_seconds: int) -> Tuple[List[SessionOutput], List[dict]]:
        """
        Full CP-SAT constraint programming solver for optimal timetabling
        """
        model = cp_model.CpModel()
        
        # Build indices
        num_sessions = len(requirements)
        num_days = len(self.DAYS)
        num_timeslots = len(self.TIME_SLOTS)
        num_lecturers = len(self.lecturers)
        num_venues = len(self.venues)
        
        # Create lecturer and venue lookup
        lecturer_map = {l.name: idx for idx, l in enumerate(self.lecturers)}
        venue_map = {v.name: idx for idx, v in enumerate(self.venues)}
        
        # Decision variables: session_vars[s][d][t][l][v] = 1 if session s is assigned to day d, timeslot t, lecturer l, venue v
        session_vars = {}
        
        for s_idx, req in enumerate(requirements):
            duration = req['duration']
            session_vars[s_idx] = {}
            
            for d_idx in range(num_days):
                day = self.DAYS[d_idx]
                session_vars[s_idx][d_idx] = {}
                
                # Only consider timeslots where session fits
                for t_idx in range(num_timeslots - duration + 1):
                    # Check if any slot in this duration overlaps with blocked times
                    is_blocked = False
                    for offset in range(duration):
                        if self._is_slot_blocked(day, self.TIME_SLOTS[t_idx + offset]):
                            is_blocked = True
                            break
                    
                    if is_blocked:
                        continue  # Skip this time slot entirely
                    
                    session_vars[s_idx][d_idx][t_idx] = {}
                    
                    for l_idx in range(num_lecturers):
                        lecturer = self.lecturers[l_idx]
                        
                        # Check lecturer availability
                        if lecturer.availability and day not in lecturer.availability:
                            continue
                        
                        session_vars[s_idx][d_idx][t_idx][l_idx] = {}
                        
                        for v_idx in range(num_venues):
                            venue = self.venues[v_idx]
                            
                            # Check venue type requirements
                            if req['requires_lab'] and venue.venue_type != 'Lab':
                                continue
                            
                            # Create boolean variable
                            var_name = f"s{s_idx}_d{d_idx}_t{t_idx}_l{l_idx}_v{v_idx}"
                            session_vars[s_idx][d_idx][t_idx][l_idx][v_idx] = model.NewBoolVar(var_name)
        
        # CONSTRAINT 1: Each session must be assigned exactly once
        unassignable_sessions = []
        for s_idx in range(num_sessions):
            possible_assignments = []
            for d_idx in session_vars.get(s_idx, {}):
                for t_idx in session_vars[s_idx].get(d_idx, {}):
                    for l_idx in session_vars[s_idx][d_idx].get(t_idx, {}):
                        for v_idx in session_vars[s_idx][d_idx][t_idx].get(l_idx, {}):
                            possible_assignments.append(session_vars[s_idx][d_idx][t_idx][l_idx][v_idx])
            
            if possible_assignments:
                model.Add(sum(possible_assignments) == 1)
            else:
                # Track sessions that cannot be assigned due to no valid slots
                req = requirements[s_idx]
                unassignable_sessions.append({
                    'session_idx': s_idx,
                    'unit': req['unit'].code,
                    'type': req['type'],
                    'duration': req['duration'],
                    'requires_lab': req['requires_lab'],
                    'reason': 'No valid time slots available (check lecturer availability, venue capacity, blocked times, or session duration)'
                })
                print(f"WARNING: Cannot assign {req['type']} for {req['unit'].code} - no valid time slots found")
        
        # If too many sessions are unassignable, report early
        if len(unassignable_sessions) > num_sessions * 0.3:  # More than 30% unassignable
            print(f"ERROR: {len(unassignable_sessions)} out of {num_sessions} sessions cannot be assigned!")
            conflicts = [{
                'type': 'unassigned_session',
                'unit': s['unit'],
                'session_type': s['type'],
                'message': f"{s['type']} for {s['unit']}: {s['reason']}"
            } for s in unassignable_sessions]
            return [], conflicts
        
        # CONSTRAINT 2: No lecturer double-booking
        for l_idx in range(num_lecturers):
            for d_idx in range(num_days):
                for t_idx in range(num_timeslots):
                    # Find all sessions that use this lecturer at this time
                    overlapping = []
                    for s_idx, req in enumerate(requirements):
                        duration = req['duration']
                        # Check if session s_idx could overlap with timeslot t_idx
                        for start_t in range(max(0, t_idx - duration + 1), min(t_idx + 1, num_timeslots - duration + 1)):
                            if (s_idx in session_vars and 
                                d_idx in session_vars[s_idx] and 
                                start_t in session_vars[s_idx][d_idx] and
                                l_idx in session_vars[s_idx][d_idx][start_t]):
                                for v_idx in session_vars[s_idx][d_idx][start_t][l_idx]:
                                    overlapping.append(session_vars[s_idx][d_idx][start_t][l_idx][v_idx])
                    
                    if overlapping:
                        model.Add(sum(overlapping) <= 1)
        
        # CONSTRAINT 3: No venue double-booking
        for v_idx in range(num_venues):
            for d_idx in range(num_days):
                for t_idx in range(num_timeslots):
                    overlapping = []
                    for s_idx, req in enumerate(requirements):
                        duration = req['duration']
                        for start_t in range(max(0, t_idx - duration + 1), min(t_idx + 1, num_timeslots - duration + 1)):
                            if (s_idx in session_vars and 
                                d_idx in session_vars[s_idx] and 
                                start_t in session_vars[s_idx][d_idx]):
                                for l_idx in session_vars[s_idx][d_idx][start_t]:
                                    if v_idx in session_vars[s_idx][d_idx][start_t][l_idx]:
                                        overlapping.append(session_vars[s_idx][d_idx][start_t][l_idx][v_idx])
                    
                    if overlapping:
                        model.Add(sum(overlapping) <= 1)
        
        # CONSTRAINT 4: Lecturer workload limits
        for l_idx in range(num_lecturers):
            lecturer = self.lecturers[l_idx]
            weekly_hours = []
            for s_idx, req in enumerate(requirements):
                duration = req['duration']
                for d_idx in session_vars.get(s_idx, {}):
                    for t_idx in session_vars[s_idx].get(d_idx, {}):
                        if l_idx in session_vars[s_idx][d_idx].get(t_idx, {}):
                            for v_idx in session_vars[s_idx][d_idx][t_idx][l_idx]:
                                weekly_hours.append(
                                    session_vars[s_idx][d_idx][t_idx][l_idx][v_idx] * duration
                                )
            
            if weekly_hours:
                model.Add(sum(weekly_hours) <= lecturer.max_hours_per_week)
        
        # CONSTRAINT 5: Split pattern sessions MUST be on different days
        # For units with split patterns (e.g., [2,1]), the 2-hour and 1-hour sessions
        # cannot be scheduled on the same day
        for unit_code, group_info in self.unit_session_groups.items():
            if not group_info['is_split']:
                continue  # Skip single-block patterns
            
            session_indices = group_info['session_indices']
            if len(session_indices) < 2:
                continue  # Need at least 2 sessions to enforce different days
            
            # For each pair of sessions in this unit
            for i, s_idx1 in enumerate(session_indices):
                for s_idx2 in session_indices[i+1:]:
                    # Ensure sessions s_idx1 and s_idx2 are NOT on the same day
                    for d_idx in range(num_days):
                        # Collect all assignments of s_idx1 on day d_idx
                        s1_on_day = []
                        if s_idx1 in session_vars and d_idx in session_vars[s_idx1]:
                            for t_idx in session_vars[s_idx1][d_idx]:
                                for l_idx in session_vars[s_idx1][d_idx][t_idx]:
                                    for v_idx in session_vars[s_idx1][d_idx][t_idx][l_idx]:
                                        s1_on_day.append(session_vars[s_idx1][d_idx][t_idx][l_idx][v_idx])
                        
                        # Collect all assignments of s_idx2 on day d_idx
                        s2_on_day = []
                        if s_idx2 in session_vars and d_idx in session_vars[s_idx2]:
                            for t_idx in session_vars[s_idx2][d_idx]:
                                for l_idx in session_vars[s_idx2][d_idx][t_idx]:
                                    for v_idx in session_vars[s_idx2][d_idx][t_idx][l_idx]:
                                        s2_on_day.append(session_vars[s_idx2][d_idx][t_idx][l_idx][v_idx])
                        
                        # At most one of them can be on this day
                        # If both lists have variables, sum of both lists must be <= 1
                        if s1_on_day and s2_on_day:
                            model.Add(sum(s1_on_day) + sum(s2_on_day) <= 1)
                            for v_idx in session_vars[s_idx][d_idx][t_idx][l_idx]:
                                # Add duration hours for each assignment
                                weekly_hours.append(session_vars[s_idx][d_idx][t_idx][l_idx][v_idx] * duration)
            
            if weekly_hours:
                model.Add(sum(weekly_hours) <= lecturer.max_hours_per_week)
        
        # OPTIMIZATION: Soft constraints via objective function
        objective_terms = []
        
        # Prefer morning timeslots for lectures
        for s_idx, req in enumerate(requirements):
            if req['type'] == 'Lecture':
                for d_idx in session_vars.get(s_idx, {}):
                    for t_idx in session_vars[s_idx].get(d_idx, {}):
                        preference = self.TIME_PREFERENCES.get(t_idx, 5)
                        for l_idx in session_vars[s_idx][d_idx].get(t_idx, {}):
                            for v_idx in session_vars[s_idx][d_idx][t_idx][l_idx]:
                                objective_terms.append(session_vars[s_idx][d_idx][t_idx][l_idx][v_idx] * preference)
        
        # Distribute sessions across days (penalize concentration)
        for d_idx in range(num_days):
            day_sessions = []
            for s_idx in range(num_sessions):
                if d_idx in session_vars.get(s_idx, {}):
                    for t_idx in session_vars[s_idx].get(d_idx, {}):
                        for l_idx in session_vars[s_idx][d_idx].get(t_idx, {}):
                            for v_idx in session_vars[s_idx][d_idx][t_idx][l_idx]:
                                day_sessions.append(session_vars[s_idx][d_idx][t_idx][l_idx][v_idx])
            
            if day_sessions:
                # Small penalty for having too many sessions on one day
                objective_terms.append(sum(day_sessions) * -1)
        
        # Maximize objective
        if objective_terms:
            model.Maximize(sum(objective_terms))
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.num_search_workers = 4  # Parallel search
        
        status = solver.Solve(model)
        
        # Extract solution
        sessions = []
        conflicts = []
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for s_idx, req in enumerate(requirements):
                assigned = False
                for d_idx in session_vars.get(s_idx, {}):
                    for t_idx in session_vars[s_idx].get(d_idx, {}):
                        for l_idx in session_vars[s_idx][d_idx].get(t_idx, {}):
                            for v_idx in session_vars[s_idx][d_idx][t_idx][l_idx]:
                                if solver.Value(session_vars[s_idx][d_idx][t_idx][l_idx][v_idx]) == 1:
                                    duration = req['duration']
                                    session = SessionOutput(
                                        id=str(uuid.uuid4()),
                                        unit_code=req['unit'].code,
                                        unit_name=req['unit'].name,
                                        lecturer_name=self.lecturers[l_idx].name,
                                        venue_name=self.venues[v_idx].name,
                                        day=self.DAYS[d_idx],
                                        start_time=self.TIME_SLOTS[t_idx][0],
                                        end_time=self.TIME_SLOTS[t_idx + duration - 1][1],
                                        session_type=req['type'],
                                        program_groups=req['unit'].program_groups
                                    )
                                    sessions.append(session)
                                    assigned = True
                                    break
                            if assigned:
                                break
                        if assigned:
                            break
                    if assigned:
                        break
                
                if not assigned:
                    conflicts.append({
                        'type': 'unassigned_session',
                        'unit': req['unit'].code,
                        'session_type': req['type'],
                        'message': f"Could not assign {req['type']} for {req['unit'].code}"
                    })
        else:
            # Solver couldn't find a solution
            conflicts.append({
                'type': 'solver_failed',
                'status': solver.StatusName(status),
                'message': f"CP-SAT solver failed with status: {solver.StatusName(status)}"
            })
            # Fall back to greedy
            return self._greedy_fallback(requirements)
        
        # Detect any remaining conflicts
        detected_conflicts = self._detect_conflicts(sessions)
        conflicts.extend(detected_conflicts)
        
        # VALIDATION: Ensure all weekly hours are fully assigned for each unit
        weekly_hour_conflicts = self._validate_weekly_hours(sessions, requirements)
        conflicts.extend(weekly_hour_conflicts)
        
        return sessions, conflicts
    
    def _validate_weekly_hours(self, sessions: List[SessionOutput], requirements: List[Dict]) -> List[dict]:
        """
        Validate that each unit receives its full weekly hour allocation.
        
        For split patterns (e.g., [2,1]), ensures BOTH the 2-hour and 1-hour 
        sessions are scheduled. Partial assignments are flagged as conflicts.
        
        Returns: List of conflict dictionaries for units with incomplete assignments
        """
        conflicts = []
        
        # Group sessions by unit code
        unit_sessions = {}
        for session in sessions:
            if session.unit_code not in unit_sessions:
                unit_sessions[session.unit_code] = []
            unit_sessions[session.unit_code].append(session)
        
        # Build unit info from requirements if unit_session_groups doesn't exist
        if not hasattr(self, 'unit_session_groups'):
            # For greedy fallback - build from requirements
            unit_info = {}
            for req in requirements:
                unit_code = req['unit'].code
                if unit_code not in unit_info:
                    # Get weekly hours for this unit
                    weekly_hours = self._get_weekly_hours_for_unit(unit_code)
                    pattern = self._select_pattern_for_weekly_hours(weekly_hours, unit_code)
                    unit_info[unit_code] = {
                        'total_hours': sum(pattern),
                        'pattern': pattern,
                        'is_split': len(pattern) > 1
                    }
        else:
            unit_info = self.unit_session_groups
        
        # Validate each unit
        for unit_code, group_info in unit_info.items():
            expected_hours = group_info['total_hours']
            pattern = group_info['pattern']
            is_split = group_info['is_split']
            
            # Calculate actual hours assigned
            actual_sessions = unit_sessions.get(unit_code, [])
            actual_hours = 0
            session_days = set()
            
            for session in actual_sessions:
                # Calculate session duration in hours
                start_time = session.start_time
                end_time = session.end_time
                start_hour = int(start_time.split(':')[0])
                end_hour = int(end_time.split(':')[0])
                duration = end_hour - start_hour
                actual_hours += duration
                session_days.add(session.day)
            
            # Check if full weekly hours are assigned
            if actual_hours < expected_hours:
                conflicts.append({
                    'type': 'incomplete_weekly_hours',
                    'unit': unit_code,
                    'expected_hours': expected_hours,
                    'actual_hours': actual_hours,
                    'pattern': pattern,
                    'message': f"{unit_code}: Expected {expected_hours} hrs/week (pattern {pattern}), but only {actual_hours} hrs assigned. Missing {expected_hours - actual_hours} hours."
                })
                print(f"WARNING: {unit_code} has incomplete weekly hours - expected {expected_hours}, got {actual_hours}")
            
            # For split patterns, validate sessions are on different days
            if is_split and len(actual_sessions) > 1:
                if len(session_days) < len(actual_sessions):
                    conflicts.append({
                        'type': 'split_sessions_same_day',
                        'unit': unit_code,
                        'pattern': pattern,
                        'days': list(session_days),
                        'message': f"{unit_code}: Split pattern {pattern} has multiple sessions on the same day. Each block must be on a different day."
                    })
                    print(f"WARNING: {unit_code} has split sessions on the same day - pattern {pattern}, days {session_days}")
            
            # Additional check: For split patterns, ensure we have the right number of sessions
            if is_split:
                expected_session_count = len(pattern)
                actual_session_count = len(actual_sessions)
                if actual_session_count < expected_session_count:
                    conflicts.append({
                        'type': 'missing_pattern_blocks',
                        'unit': unit_code,
                        'pattern': pattern,
                        'expected_blocks': expected_session_count,
                        'actual_blocks': actual_session_count,
                        'message': f"{unit_code}: Pattern {pattern} requires {expected_session_count} separate sessions, but only {actual_session_count} were scheduled."
                    })
                    print(f"WARNING: {unit_code} missing pattern blocks - expected {expected_session_count}, got {actual_session_count}")
        
        if conflicts:
            print(f"\n[!] VALIDATION FAILED: {len(conflicts)} weekly hour conflicts detected")
            for conflict in conflicts:
                print(f"  - {conflict['message']}")
        else:
            print(f"\n[OK] VALIDATION PASSED: All units have complete weekly hour assignments")
        
        return conflicts
    
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
        """
        Greedy heuristic fallback with split pattern awareness and day balancing.
        
        Ensures split pattern sessions (e.g., [2,1]) are placed on different days.
        Optionally balances load across days to avoid empty Fridays.
        """
        sessions = []
        conflicts = []
        
        # Simple greedy: Assign each session to first available slot
        occupied = {}  # (day, time, resource) -> session_id
        lecturer_hours = defaultdict(int)  # Track lecturer workload
        unit_session_days = defaultdict(set)  # Track which days each unit already has sessions
        daily_session_count = defaultdict(int)  # Track sessions per day for balancing
        timeslot_session_count = defaultdict(int)  # Track sessions per time slot for balancing
        unit_lecturers = {}  # Track which lecturer is assigned to each unit (for split patterns)
        
        # Get settings
        respect_lecturer_availability = self.settings.get('respect_lecturer_availability', False)
        balance_daily_load = self.settings.get('balance_daily_load', True)
        
        # Track assignment statistics
        total_requirements = len(requirements)
        assigned_count = 0
        failed_count = 0
        
        print(f"\nStarting greedy assignment for {total_requirements} session requirements")
        print(f"Settings: respect_lecturer_availability={respect_lecturer_availability}, balance_daily_load={balance_daily_load}")
        
        for req_idx, req in enumerate(requirements):
            assigned = False
            unit_code = req['unit'].code
            duration = req['duration']
            session_type = req['type']
            block_index = req.get('block_index', 0)
            
            # Check if this unit has a split pattern
            is_split_pattern = False
            if hasattr(self, 'unit_session_groups') and unit_code in self.unit_session_groups:
                is_split_pattern = self.unit_session_groups[unit_code]['is_split']
            
            # For split patterns, use the same lecturer for all blocks
            if is_split_pattern and unit_code in unit_lecturers:
                # Force use of previously assigned lecturer
                suitable_lecturers = [unit_lecturers[unit_code]]
            else:
                # Get suitable lecturers (prefer by department, but allow any)
                suitable_lecturers = self.lecturers.copy()
                # Sort by current workload (prefer less loaded lecturers)
                suitable_lecturers.sort(key=lambda l: lecturer_hours[l.name])
            
            # CRITICAL DEBUG: Log every split pattern session attempt
            if is_split_pattern:
                pattern = self.unit_session_groups[unit_code]['pattern']
                assigned_lecturer = unit_lecturers.get(unit_code)
                print(f"\n  [{req_idx+1}/{len(requirements)}] SPLIT PATTERN: {unit_code} {session_type} ({duration}h)")
                print(f"      Pattern: {pattern}, Block: {block_index}/{len(pattern)-1}, Days used: {unit_session_days[unit_code]}")
                if assigned_lecturer:
                    print(f"      Using previously assigned lecturer: {assigned_lecturer.name}")
            
            # Track why assignment failed
            failure_reasons = {
                'no_available_day': 0,
                'blocked_slots': 0,
                'lecturer_unavailable': 0,
                'lecturer_overloaded': 0,
                'no_suitable_venue': 0,
                'slot_conflicts': 0
            }
            
            # For day balancing: try days with fewer sessions first
            days_to_try = self.DAYS.copy()
            if balance_daily_load:
                # Sort days by current session count (ascending)
                days_to_try.sort(key=lambda d: daily_session_count[d])
            
            for day in days_to_try:
                # CRITICAL: For split patterns, skip days that already have sessions for this unit
                if is_split_pattern and day in unit_session_days[unit_code]:
                    failure_reasons['no_available_day'] += 1
                    continue  # This unit already has a session on this day
                
                # For time slot balancing: try slots with fewer sessions first
                slot_indices = list(range(len(self.TIME_SLOTS) - duration + 1))
                if balance_daily_load:
                    # Sort time slots by current session count (ascending) to distribute load
                    slot_indices.sort(key=lambda idx: timeslot_session_count[idx])
                
                for slot_idx in slot_indices:
                    # Check if this slot is blocked by institutional events
                    slot_blocked = False
                    for t in range(slot_idx, slot_idx + duration):
                        if self._is_slot_blocked(day, self.TIME_SLOTS[t]):
                            slot_blocked = True
                            break
                    
                    if slot_blocked:
                        failure_reasons['blocked_slots'] += 1
                        continue
                    
                    for lecturer in suitable_lecturers:
                        # Check lecturer availability (only if setting is enabled)
                        if respect_lecturer_availability and lecturer.availability and day not in lecturer.availability:
                            failure_reasons['lecturer_unavailable'] += 1
                            continue
                        
                        # Check if lecturer hasn't exceeded max hours
                        if lecturer_hours[lecturer.name] + duration > lecturer.max_hours_per_week:
                            failure_reasons['lecturer_overloaded'] += 1
                            continue
                        
                        for venue in self.venues:
                            # Check if slot is free
                            if req['requires_lab'] and venue.venue_type != 'Lab':
                                failure_reasons['no_suitable_venue'] += 1
                                continue
                            
                            # Check conflicts
                            has_conflict = False
                            for t in range(slot_idx, slot_idx + duration):
                                lec_key = (day, t, 'lecturer', lecturer.name)
                                ven_key = (day, t, 'venue', venue.name)
                                if lec_key in occupied or ven_key in occupied:
                                    has_conflict = True
                                    break
                            
                            if has_conflict:
                                failure_reasons['slot_conflicts'] += 1
                                continue
                            
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
                                end_time=self.TIME_SLOTS[slot_idx + duration - 1][1],
                                session_type=req['type'],
                                program_groups=req['unit'].program_groups
                            )
                            sessions.append(session)
                            
                            # Mark as occupied
                            for t in range(slot_idx, slot_idx + duration):
                                occupied[(day, t, 'lecturer', lecturer.name)] = session_id
                                occupied[(day, t, 'venue', venue.name)] = session_id
                            
                            # Track lecturer hours
                            lecturer_hours[lecturer.name] += duration
                            
                            # Track that this unit now has a session on this day
                            unit_session_days[unit_code].add(day)
                            
                            # For split patterns, remember the lecturer for subsequent blocks
                            if is_split_pattern and unit_code not in unit_lecturers:
                                unit_lecturers[unit_code] = lecturer
                            
                            # Track daily session count for balancing
                            daily_session_count[day] += 1
                            
                            # Track time slot usage for balancing
                            timeslot_session_count[slot_idx] += 1
                            
                            # Increment assigned count
                            assigned_count += 1
                            
                            if is_split_pattern:
                                print(f"      [OK] SUCCESS: Assigned on {day} at {self.TIME_SLOTS[slot_idx][0]} with {lecturer.name}")
                                print(f"      Days now used by {unit_code}: {unit_session_days[unit_code]}")
                            
                            assigned = True
                            break
                        
                        if assigned:
                            break
                    if assigned:
                        break
                if assigned:
                    break
            
            if not assigned:
                # Log failure reasons
                failed_count += 1
                total_attempts = sum(failure_reasons.values())
                conflict_msg = f"Could not assign {session_type} ({duration}h) for {unit_code}"
                
                if is_split_pattern:
                    print(f"\n      [!] FAILED: Could not assign {duration}h session (block {block_index})")
                    conflict_msg += f" - SPLIT PATTERN block {block_index}, days already used: {unit_session_days[unit_code]}"
                    print(f"      Failure breakdown (total {total_attempts} attempts):")
                    for reason, count in failure_reasons.items():
                        if count > 0:
                            print(f"        - {reason}: {count}")
                            conflict_msg += f"{reason}={count}, "
                else:
                    conflict_msg += " - no available slot"
                    if total_attempts > 0:
                        conflict_msg += f"\n    Failure reasons: "
                        for reason, count in failure_reasons.items():
                            if count > 0:
                                conflict_msg += f"{reason}={count}, "
                
                if not is_split_pattern:
                    print(f"  WARNING: {conflict_msg}")
                conflicts.append({
                    'type': 'unassigned_session',
                    'unit': unit_code,
                    'session_type': session_type,
                    'duration': duration,
                    'message': conflict_msg
                })
        
        # Print assignment summary
        print(f"\n{'='*50}")
        print(f"GREEDY ASSIGNMENT SUMMARY")
        print(f"{'='*50}")
        print(f"Total requirements: {total_requirements}")
        print(f"Successfully assigned: {assigned_count} ({assigned_count*100//total_requirements if total_requirements > 0 else 0}%)")
        print(f"Failed to assign: {failed_count} ({failed_count*100//total_requirements if total_requirements > 0 else 0}%)")
        print(f"Total sessions created: {len(sessions)}")
        print(f"Total conflicts: {len(conflicts)}")
        
        if failed_count > 0:
            print(f"\n[!] WARNING: {failed_count} sessions failed to be assigned!")
            print(f"This will result in units receiving incomplete weekly hours.")
        
        print(f"{'='*50}\n")
        
        # Print daily distribution summary
        print(f"\n=== DAILY DISTRIBUTION ===")
        for day in self.DAYS:
            print(f"  {day}: {daily_session_count[day]} sessions")
        print("=" * 27)
        
        # Print time slot distribution summary
        print(f"\n=== TIME SLOT DISTRIBUTION ===")
        for slot_idx in range(len(self.TIME_SLOTS)):
            if timeslot_session_count[slot_idx] > 0:
                print(f"  {self.TIME_SLOTS[slot_idx][0]}-{self.TIME_SLOTS[slot_idx][1]}: {timeslot_session_count[slot_idx]} sessions")
        print("=" * 31)
        
        # Validate weekly hours for greedy solution too
        weekly_hour_conflicts = self._validate_weekly_hours(sessions, requirements)
        conflicts.extend(weekly_hour_conflicts)
        
        return sessions, conflicts
