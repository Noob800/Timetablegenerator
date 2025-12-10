# Timetable Version Management & Database Regeneration

## Overview
The system now supports:
- **Generating multiple timetable versions** without overwriting existing ones
- **Regenerating from database** without re-uploading CSV files
- **Managing versions** (activate, delete, compare)
- **Automatic database status detection**

## Key Features

### 1. **Database-Aware Generation**
- Automatically checks database on page load
- Shows green status banner when data exists:
  - "Database Ready for Generation"
  - Displays counts: X units, Y lecturers, Z venues
- Generate button enabled when either:
  - All files uploaded in current session, OR
  - Database has required data (units > 0, lecturers > 0, venues > 0)

### 2. **Flexible Workflow**
Two ways to generate timetables:

**Option A: Upload & Generate** (First time or data refresh)
1. Upload Units.csv
2. Upload Lecturers.csv  
3. Upload Venues.csv
4. Click "Generate Timetable"

**Option B: Regenerate from Database** (Subsequent generations)
1. Visit Generate page
2. See green banner confirming data loaded
3. Click "Regenerate New Version" directly
4. No file uploads needed!

### 3. **Version Management**
Location: `client/src/pages/Generate.tsx`

- Shows all generated timetable versions in a card-based list
- Each version displays:
  - Version ID and optional name
  - Creation timestamp
  - Total sessions count
  - Conflict count (color-coded: green for 0, red for >0)
  - Active status badge
  - Action buttons (Activate, Delete)

### 4. **Smart Button States**
- Button text changes based on context:
  - "Generate Timetable" - when no versions exist
  - "Regenerate New Version" - when versions already exist
- Button enabled when:
  - Files uploaded in current session, OR
  - Database contains data from previous uploads
- Helpful messages shown when button is disabled

## User Workflow

### First Time Setup
1. Upload all three CSV files (Units, Lecturers, Venues)
2. Data is persisted to SQLite database
3. Click "Generate Timetable"
4. View generated version in list below

### Regenerating New Versions
1. Return to Generate page (no uploads needed!)
2. Green banner shows database is ready
3. Click "Regenerate New Version"
4. CP-SAT solver creates new optimized version
5. Compare versions by conflict counts
6. Activate the best version

### Managing Versions
1. View all versions in "Generated Timetable Versions" section
2. Compare versions by looking at:
   - Conflict counts (lower is better)
   - Total sessions (should match expected)
   - Creation time
3. Click "Activate" on a different version to make it active
4. Click trash icon to delete unwanted versions

### Viewing Active Version
- Dashboard always shows data from currently active version
- To switch views, activate a different version on Generate page
- Active version clearly marked with "Active" badge

## Technical Implementation

### Database Status Check
```typescript
const checkDatabaseStatus = async () => {
  const status = await api.getUploadStatus();
  setDbStatus({
    units: status.units || 0,
    lecturers: status.lecturers || 0,
    venues: status.venues || 0
  });
};
```

### Smart Generation Logic
```typescript
const hasDataInDatabase = dbStatus && 
                         dbStatus.units > 0 && 
                         dbStatus.lecturers > 0 && 
                         dbStatus.venues > 0;

const canGenerate = allFilesUploaded || hasDataInDatabase;
```

### API Integration
- `api.getUploadStatus()` - Check database counts
- `api.uploadUnits/Lecturers/Venues(file)` - Upload and persist data
- `api.generateTimetable()` - Generate from current database state
- `api.listTimetables()` - Fetch all versions
- `api.activateTimetable(id)` - Set active version
- `api.deleteTimetable(id)` - Remove version

### UI Components
- Green status banner when database ready
- File upload success counters
- Dynamic button text and state
- Version list with action buttons
- Color-coded conflict indicators
- Loading states and toast notifications

## Benefits

### For Users
✅ **No repeated uploads** - Upload once, regenerate many times
✅ **Easy experimentation** - Generate multiple versions, pick the best
✅ **Quick comparison** - See conflict counts at a glance
✅ **Persistent data** - Database survives page refreshes
✅ **Clear status** - Always know if you can generate

### For Workflow
✅ **Faster iterations** - Skip upload step when regenerating
✅ **Version history** - Keep track of all generated schedules
✅ **Flexible updates** - Upload new data only when needed
✅ **Safe testing** - Old versions stay until you delete them

## Future Enhancements
- [ ] Add version naming/renaming capability
- [ ] Export specific version to PDF/Excel
- [ ] Side-by-side version comparison view
- [ ] Version notes/comments
- [ ] Rollback to previous version
- [ ] Archive old versions instead of deleting
- [ ] Statistics comparison chart across versions
- [ ] Bulk delete old versions
- [ ] Auto-cleanup after X days
