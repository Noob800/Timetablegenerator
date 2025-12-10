# Demo Data for Timetable Maker

This folder contains sample CSV files for testing and demonstration purposes.

## Files

- **units.csv**: 15 sample units across different departments
- **lecturers.csv**: 14 sample lecturers with availability
- **venues.csv**: 20 sample venues (lecture halls, labs, classrooms, seminar rooms)

## How to Load Demo Data

### Option 1: Using the Seed Script (Recommended)
```powershell
cd backend
../.venv/Scripts/python.exe scripts/seed_database.py
```

### Option 2: Via API Upload
1. Start the servers: `npm run dev`
2. Go to Generate page
3. Upload each CSV file:
   - Click "Units" → Select `demo_data/units.csv`
   - Click "Lecturers" → Select `demo_data/lecturers.csv`
   - Click "Venues" → Select `demo_data/venues.csv`

### Option 3: Copy to sample_data (For Seed Script)
```powershell
Copy-Item backend/demo_data/*.csv backend/sample_data/
cd backend
../.venv/Scripts/python.exe scripts/seed_database.py
```

## Data Overview

### Units (15)
- Computer Science: COMP 100, COMP 101, DBMS 201, WEB 301, NET 202, AI 401
- Mathematics: MATH 110, MATH 111
- Sciences: PHYS 205, CHEM 101
- Nursing: NRSG 343, NRSG 344
- Theology: THEO 121, THEO 122
- General: COMM 111

### Lecturers (14)
Covering departments: Computer Science, Mathematics, Theology, Nursing, Physics, Chemistry, Web Dev, Networks, AI, Communication

### Venues (20)
- 4 Lecture Halls (capacity 100-500)
- 8 Labs (Computer, Nursing, Physics, Chemistry)
- 4 Classrooms (capacity 60-80)
- 2 Seminar Rooms (capacity 25)

## Expected Timetable Output

With this data, the system should generate:
- **~45-60 sessions** per week
- Mix of lectures (2hrs), labs (3hrs), and tutorials (1hr)
- Distributed across Monday-Friday, 7 AM - 7 PM
- Utilizing 12-15 venues
- Assigning 10-12 lecturers

## Notes

- Program groups follow format: `DEPT-Y#` (e.g., CS-Y1 = Computer Science Year 1)
- `ALL-Y1` indicates a unit for all first-year students
- Lecturer availability is realistic (not all available all days)
- Venue capacities match typical program group sizes
