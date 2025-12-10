# Flexible Time Allocation System - Implementation Guide

## Overview
This system replaces hardcoded teaching hour durations with a fully configurable, settings-driven approach that allows registrars to define semester length, total teaching hours, and allowed time-block patterns.

## Key Features

### 1. **Global Settings Configuration**
- **Semester Weeks**: Define the number of teaching weeks (default: 14)
- **Total Hours per Unit**: Total teaching hours per semester (default: 42)
- **Calculated Weekly Hours**: Automatically computed as `total_hours / semester_weeks` (default: 3 hrs/week)

### 2. **Allowed Time-Block Patterns**
Registrars can define which patterns are allowed:
- `[3]` - Single 3-hour block
- `[2, 1]` - 2-hour block + 1-hour block
- `[1, 2]` - 1-hour block + 2-hour block
- `[1, 1, 1]` - Three 1-hour blocks (disabled by default)
- Custom patterns can be added/removed

### 3. **Pattern Preferences**
- **Prefer 3-Hour Blocks**: Prioritizes patterns with 3-hour continuous blocks
- **Allow Split Blocks**: Enables patterns like [2,1] or [1,2]

### 4. **Unit-Specific Overrides**
- Search and select any unit
- Set custom weekly hours that override the global calculation
- Add notes explaining why the override is needed
- Visual indicators show which units have overrides

## Architecture

### Backend Changes

#### 1. Database Schema (`database.py`)
```python
class Settings(Base):
    # ... existing fields ...
    semester_weeks = Column(Integer, nullable=True, default=14)
    total_hours_per_unit = Column(Integer, nullable=True, default=42)
    allowed_patterns = Column(JSON, nullable=True, default=None)
    prefer_three_hour_blocks = Column(Boolean, nullable=True, default=True)
    allow_split_blocks = Column(Boolean, nullable=True, default=True)

class UnitWeeklyOverride(Base):
    __tablename__ = "unit_weekly_overrides"
    id = Column(Integer, primary_key=True, index=True)
    unit_code = Column(String, unique=True, nullable=False, index=True)
    custom_weekly_hours = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
```

#### 2. Migration Script (`backend/migrate_time_allocation.py`)
Automatically adds new columns to existing databases:
```bash
cd backend
python migrate_time_allocation.py
```

#### 3. API Endpoints (`api/routes.py`)

**Settings Endpoints (Enhanced):**
- `GET /api/settings` - Returns all settings including time allocation fields
- `PUT /api/settings` - Updates settings with new time allocation values

**Unit Override Endpoints (New):**
- `GET /api/unit-overrides` - List all overrides
- `POST /api/unit-overrides` - Create/update override for a unit
- `DELETE /api/unit-overrides/{unit_code}` - Remove override
- `GET /api/units/with-overrides` - List all units with override info

#### 4. Solver Logic (`services/timetable_solver.py`)

**New Methods:**
```python
def _get_weekly_hours_for_unit(self, unit_code: str) -> int:
    """
    Priority: 
    1. Unit-specific override (if exists)
    2. Global calculation (total_hours / semester_weeks)
    """

def _select_pattern_for_weekly_hours(self, weekly_hours: int) -> List[int]:
    """
    Selects pattern from allowed_patterns based on:
    - Pattern sum matches weekly_hours
    - Respects allow_split_blocks setting
    - Prioritizes 3-hour blocks if prefer_three_hour_blocks is True
    """

def _pattern_to_sessions(self, pattern: List[int], unit, session_type) -> List[Dict]:
    """
    Converts pattern [2, 1] into two session requirements:
    - Session 1: 2-hour duration
    - Session 2: 1-hour duration
    """
```

**Updated Method:**
```python
def _create_session_requirements(self) -> List[Dict[str, Any]]:
    """
    BEFORE: Hardcoded durations (2-hour lectures, 3-hour labs, 1-hour tutorials)
    AFTER: Dynamic calculation based on settings and overrides
    """
```

### Frontend Changes

#### 1. TypeScript Types (`client/src/lib/api.ts`)
```typescript
export interface TimeAllocationPattern {
  pattern: number[];
  label: string;
}

export interface Settings {
  // ... existing fields ...
  semester_weeks: number;
  total_hours_per_unit: number;
  allowed_patterns: TimeAllocationPattern[];
  prefer_three_hour_blocks: boolean;
  allow_split_blocks: boolean;
}

export interface UnitWeeklyOverride {
  id?: number;
  unit_code: string;
  custom_weekly_hours: number;
  notes?: string;
}

export interface UnitWithOverrideInfo {
  code: string;
  name: string;
  global_weekly_hours: number;
  has_override: boolean;
  override_weekly_hours: number | null;
  effective_weekly_hours: number;
  override_notes: string | null;
}
```

#### 2. Settings Page (`client/src/pages/Settings.tsx`)
Added new **Time Allocation** section with:
- Semester configuration inputs
- Live calculation display of weekly hours
- Pattern management (add/remove patterns)
- Pattern preference toggles
- Link to Unit Overrides page

#### 3. Unit Overrides Page (`client/src/pages/UnitOverrides.tsx`) - **NEW**
Features:
- Searchable list of all units
- Visual distinction between global and override hours
- Stats cards showing total units, overrides, and global
- Edit dialog for setting custom hours
- Notes field for documenting override reasons
- Delete functionality to revert to global calculation

#### 4. Navigation (`client/src/components/layout/Shell.tsx`)
Added "Unit Overrides" menu item with Clock icon

## Usage Guide

### For Registrars

#### 1. **Configure Global Settings**
Navigate to **Settings > Time Allocation**:

1. Set **Semester Weeks** (e.g., 14, 15, 16)
2. Set **Total Hours per Unit** (e.g., 42, 45, 48)
3. Review calculated weekly hours (e.g., 42 ÷ 14 = 3 hrs/week)
4. Manage **Allowed Patterns**:
   - Keep [3], [2,1], [1,2] for standard units
   - Add [4] if you have 4-hour sessions
   - Remove patterns you don't want
5. Set **Preferences**:
   - Enable "Prefer 3-Hour Blocks" for better scheduling
   - Enable "Allow Split Blocks" for flexibility
6. Click **Save Settings**

#### 2. **Set Unit-Specific Overrides**
Navigate to **Unit Overrides**:

1. Use search to find a specific unit
2. Click **Override** button
3. Set custom weekly hours (e.g., 5 hours instead of 3)
4. Add notes explaining why (e.g., "Special intensive course")
5. Click **Save Override**

Units with overrides are highlighted in orange.

#### 3. **Generate Timetable**
Navigate to **Generate**:

1. Upload units, lecturers, venues (or use database)
2. Click **Generate Timetable**
3. Solver will use:
   - Custom hours for units with overrides
   - Global calculation for all other units
   - Allowed patterns from settings
   - Pattern preferences

## Backward Compatibility

### Default Behavior (No Configuration)
If settings are missing or database hasn't been migrated:
- **Semester Weeks**: Defaults to 14
- **Total Hours**: Defaults to 42
- **Weekly Hours**: Defaults to 3 (42 ÷ 14)
- **Patterns**: Defaults to [3], [2,1], [1,2]
- **Preferences**: Prefer 3-hour blocks = True, Allow split = True

This matches the previous hardcoded behavior of 3-hour sessions.

### Migration Path
1. Run `python backend/migrate_time_allocation.py`
2. Existing timetables continue to work
3. New generations use flexible system
4. No data loss or breaking changes

## Examples

### Example 1: Standard 14-Week Semester
**Settings:**
- Semester Weeks: 14
- Total Hours: 42
- Allowed Patterns: [3], [2,1], [1,2]

**Result:** All units get 3 hrs/week (one 3-hour session)

### Example 2: Intensive 12-Week Semester
**Settings:**
- Semester Weeks: 12
- Total Hours: 42
- Allowed Patterns: [3], [4], [2,1]

**Result:** All units get 3.5 hrs/week → Solver uses [4] or [3] pattern depending on fit

### Example 3: Unit Override for Special Course
**Global:** 3 hrs/week
**Override for COMP501:** 6 hrs/week
**Allowed Patterns:** [3], [6], [3,3]

**Result:**
- COMP501 gets 6 hours (pattern [6] or [3,3])
- All other units get 3 hours (pattern [3])

## Technical Notes

### Pattern Selection Algorithm
```python
def _select_pattern_for_weekly_hours(weekly_hours, allowed_patterns, preferences):
    # 1. Filter patterns where sum(pattern) == weekly_hours
    valid = [p for p in allowed_patterns if sum(p['pattern']) == weekly_hours]
    
    # 2. If allow_split_blocks == False, filter out multi-block patterns
    if not allow_split_blocks:
        valid = [p for p in valid if len(p['pattern']) == 1]
    
    # 3. If prefer_three_hour_blocks == True, sort by:
    #    - Count of 3s in pattern (descending)
    #    - Single block patterns first
    if prefer_three_hour_blocks:
        valid.sort(key=lambda p: (p['pattern'].count(3), len(p['pattern']) == 1), reverse=True)
    
    # 4. Return first match (or generate fallback)
    return valid[0] if valid else generate_fallback(weekly_hours)
```

### Database Query Optimization
Unit overrides use indexed lookups:
```python
override = db.query(UnitWeeklyOverride).filter(
    UnitWeeklyOverride.unit_code == unit_code
).first()
```

Index created by migration script ensures O(log n) lookups.

## Testing Checklist

- [x] Migration runs successfully on existing database
- [x] Settings page loads with new fields
- [x] Default values appear correctly (14 weeks, 42 hours, default patterns)
- [x] Calculated weekly hours updates when changing semester weeks or total hours
- [x] Patterns can be added/removed
- [x] Preferences toggles work
- [x] Settings save successfully
- [x] Unit Overrides page loads all units
- [x] Search functionality works
- [x] Override dialog opens and saves correctly
- [x] Override deletion works
- [x] Units with overrides show orange highlight
- [x] Timetable generation uses overrides
- [x] Solver respects pattern preferences
- [x] Backward compatibility maintained (old behavior with defaults)

## File Manifest

### Backend Files Modified/Created
- `backend/database.py` - Added Settings fields and UnitWeeklyOverride model
- `backend/migrate_time_allocation.py` - **NEW** - Migration script
- `backend/models/schemas.py` - Added TimeAllocationPattern, UnitWeeklyOverride schemas
- `backend/api/routes.py` - Enhanced settings endpoints, added override endpoints
- `backend/services/timetable_solver.py` - Refactored to use dynamic allocation

### Frontend Files Modified/Created
- `client/src/lib/api.ts` - Added new types and API methods
- `client/src/pages/Settings.tsx` - Added Time Allocation section
- `client/src/pages/UnitOverrides.tsx` - **NEW** - Override management page
- `client/src/App.tsx` - Added route for /unit-overrides
- `client/src/components/layout/Shell.tsx` - Added Unit Overrides nav item

## Future Enhancements

1. **Bulk Override Import**: Upload CSV with unit codes and custom hours
2. **Pattern Templates**: Save common pattern sets (e.g., "Lab-Heavy", "Lecture-Heavy")
3. **Override History**: Track when overrides were created/modified
4. **Pattern Validation**: Warn if pattern doesn't match available time slots
5. **Session Type Differentiation**: Different patterns for Lecture vs Lab vs Tutorial
6. **Multi-Semester Comparison**: Compare time allocation across semesters

## Support

For issues or questions:
1. Check Settings > Time Allocation for correct configuration
2. Verify database migration ran successfully
3. Check browser console for API errors
4. Review backend logs for solver warnings
5. Test with default values first before custom overrides
