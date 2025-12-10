# Settings Persistence System

## Overview
The timetable system now has **full settings persistence** with database storage. All configuration changes are saved permanently and automatically applied to timetable generation.

## What Changed

### Database Layer
**New Model:** `Settings` table in `backend/database.py`
- Stores all configuration parameters
- Single row (auto-created on first access)
- Timestamps for tracking changes

**Fields:**
- Academic Calendar: `academic_year`, `trimester`
- Schedule Config: `schedule_start_time`, `schedule_end_time`, `session_duration`, `break_duration`
- KEMU Events: `enable_monday_devotion`, `monday_devotion_start/end`, `thursday_devotion_start/end`, `wednesday_sports_start/end`
- Notifications: `enable_conflict_notifications`, `enable_generation_notifications`

### Backend API
**New Endpoints:**
- `GET /api/settings` - Retrieve current settings (creates defaults if none exist)
- `PUT /api/settings` - Update settings with validation

**Helper Function:** `get_or_create_settings(db)`
- Returns existing settings or creates defaults
- Ensures settings always available

### Solver Integration
**TimetableSolver Updated:**
- Now accepts `settings` parameter in constructor
- Dynamically generates time slots based on `schedule_start_time` and `schedule_end_time`
- Blocks institutional event times (devotion/sports) from scheduling
- Uses `_is_slot_blocked()` to enforce event blackouts

**Blocked Slots:**
- Monday 07:00-08:00 (if devotion enabled)
- Thursday 07:00-08:00 (if devotion enabled)
- Wednesday 16:00-18:00 (if sports enabled)

**Generation Flow:**
1. `POST /api/generate` called
2. Fetches settings from database via `get_or_create_settings()`
3. Passes settings dict to TimetableSolver
4. Solver respects blocked times and schedule boundaries
5. Generated timetable honors all saved configurations

### Frontend
**Settings Page Rewrite:**
- Loads settings from `/api/settings` on mount
- Real-time editing with state management
- Save button persists to database via `PUT /api/settings`
- Loading and saving states with spinner feedback
- Toast notifications for success/errors

**Key Features:**
- No more hard-coded defaults after first save
- Settings always reflect database state
- Changes immediately available for next generation
- Database stats display (units, lecturers, venues, timetables)

## How It Works

### First Time Use
1. User visits Settings page
2. Backend creates default settings in database
3. User can edit and save
4. Defaults replaced permanently

### Subsequent Use
1. Settings page loads saved values
2. User modifies as needed
3. Click "Save Settings"
4. Database updated
5. Next timetable generation uses new settings

### Timetable Generation
1. User clicks "Generate Timetable"
2. Backend fetches current settings from database
3. Settings passed to solver:
   ```python
   settings_dict = {
       'schedule_start_time': '08:00',
       'schedule_end_time': '18:00',
       'enable_monday_devotion': True,
       # ... etc
   }
   solver = TimetableSolver(units, lecturers, venues, settings=settings_dict)
   ```
4. Solver blocks institutional events
5. Respects schedule boundaries
6. Returns timetable honoring all constraints

## KEMU-Specific Features

### Institutional Events
- **Monday Devotion:** 07:00-08:00 (default enabled)
- **Thursday Devotion:** 07:00-08:00 (default enabled)
- **Wednesday Sports:** 16:00-18:00 (default enabled)

**Behavior:**
- When enabled, these times are **completely blocked**
- No sessions scheduled during these periods
- Can be disabled via Settings page
- Times are adjustable

### Schedule Configuration
- Start Time: Controls earliest possible session
- End Time: Controls latest possible session
- Session Duration: Length of teaching blocks (30-120 min)
- Break Duration: Gap between sessions (10-30 min)

All parameters stored in database and applied consistently.

## API Reference

### GET /api/settings
**Response:**
```json
{
  "id": 1,
  "academic_year": "2024/2025",
  "trimester": "1",
  "schedule_start_time": "08:00",
  "schedule_end_time": "18:00",
  "session_duration": 60,
  "break_duration": 15,
  "enable_monday_devotion": true,
  "monday_devotion_start": "07:00",
  "monday_devotion_end": "08:00",
  "enable_thursday_devotion": true,
  "thursday_devotion_start": "07:00",
  "thursday_devotion_end": "08:00",
  "enable_wednesday_sports": true,
  "wednesday_sports_start": "16:00",
  "wednesday_sports_end": "18:00",
  "enable_conflict_notifications": true,
  "enable_generation_notifications": true,
  "created_at": "2025-12-08T10:30:00",
  "updated_at": "2025-12-08T14:15:00"
}
```

### PUT /api/settings
**Request Body:** (same structure as GET response, without id/timestamps)

**Validation:**
- `academic_year`: 7-20 characters
- `trimester`: "1", "2", or "3"
- Times: HH:MM format
- `session_duration`: 30-120 minutes
- `break_duration`: 10-30 minutes

## Benefits

### For Registrars
✅ Configure once, use forever
✅ No guessing what settings are active
✅ KEMU events automatically respected
✅ Flexible schedule adjustments

### For System
✅ Single source of truth (database)
✅ No hard-coded defaults after initial setup
✅ Settings versioned with timestamps
✅ Validation prevents invalid configurations

### For Timetable Quality
✅ Consistent schedule boundaries
✅ Institutional events never violated
✅ Settings applied uniformly across all generations
✅ Predictable, repeatable results

## Testing

### Verify Settings Persistence
1. Open Settings page → should load from database
2. Change academic year → save → refresh page → should persist
3. Disable Monday devotion → save → generate timetable → Monday 07:00-08:00 should have sessions
4. Re-enable Monday devotion → save → regenerate → Monday 07:00-08:00 should be blocked

### Verify Solver Integration
1. Set schedule 09:00-17:00 → save
2. Generate timetable
3. Check sessions: none before 09:00 or after 17:00
4. Check Monday/Thursday mornings: no sessions during devotion
5. Check Wednesday afternoon: no sessions during sports (if enabled)

## Files Changed
- `backend/database.py` - Added Settings model
- `backend/models/schemas.py` - Added SettingsInput/Output schemas
- `backend/api/routes.py` - Added GET/PUT /api/settings, updated generate to use settings
- `backend/services/timetable_solver.py` - Added settings parameter, dynamic slots, blocked times
- `client/src/lib/api.ts` - Added Settings interface and API methods
- `client/src/pages/Settings.tsx` - Complete rewrite for database integration

## Migration Notes
- Existing installations: Settings table auto-created on first API call
- Default settings applied automatically if none exist
- No data loss - only new functionality added
- Backwards compatible with existing timetables
