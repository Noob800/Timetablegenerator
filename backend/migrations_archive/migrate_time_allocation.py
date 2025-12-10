"""
Migration script to add time allocation fields to settings table and create unit_weekly_overrides table
Run this script to upgrade existing databases to support flexible time allocation system
"""

import sqlite3
import json
from pathlib import Path

# Default allowed patterns for backward compatibility
DEFAULT_PATTERNS = [
    {"pattern": [3], "label": "3 hours straight"},
    {"pattern": [2, 1], "label": "2 hours + 1 hour"},
    {"pattern": [1, 2], "label": "1 hour + 2 hours"}
]

def migrate_database(db_path: str = "./timetable.db"):
    """Add new time allocation columns to settings table and create unit_weekly_overrides table"""
    
    if not Path(db_path).exists():
        print(f"Database {db_path} does not exist. Skipping migration.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if settings table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
        if not cursor.fetchone():
            print("Settings table does not exist. Skipping migration.")
            return
        
        print("Starting migration...")
        
        # Add new columns to settings table (if they don't exist)
        columns_to_add = [
            ("semester_weeks", "INTEGER DEFAULT 14"),
            ("total_hours_per_unit", "INTEGER DEFAULT 42"),
            ("allowed_patterns", "TEXT"),  # JSON stored as TEXT in SQLite
            ("prefer_three_hour_blocks", "INTEGER DEFAULT 1"),  # Boolean as INTEGER in SQLite
            ("allow_split_blocks", "INTEGER DEFAULT 1")
        ]
        
        for column_name, column_type in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE settings ADD COLUMN {column_name} {column_type}")
                print(f"✓ Added column '{column_name}' to settings table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  Column '{column_name}' already exists, skipping")
                else:
                    raise
        
        # Set default allowed_patterns for existing records (if NULL)
        cursor.execute("SELECT id FROM settings WHERE allowed_patterns IS NULL")
        records_to_update = cursor.fetchall()
        
        if records_to_update:
            allowed_patterns_json = json.dumps(DEFAULT_PATTERNS)
            for (record_id,) in records_to_update:
                cursor.execute(
                    "UPDATE settings SET allowed_patterns = ? WHERE id = ?",
                    (allowed_patterns_json, record_id)
                )
            print(f"✓ Set default allowed_patterns for {len(records_to_update)} existing record(s)")
        
        # Create unit_weekly_overrides table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS unit_weekly_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unit_code TEXT NOT NULL UNIQUE,
                custom_weekly_hours INTEGER NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✓ Created unit_weekly_overrides table (or already exists)")
        
        # Create index on unit_code for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_unit_weekly_overrides_unit_code 
            ON unit_weekly_overrides(unit_code)
        """)
        print("✓ Created index on unit_code")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("\nNew features enabled:")
        print("  - Semester weeks configuration (default: 14)")
        print("  - Total hours per unit per semester (default: 42)")
        print("  - Allowed weekly patterns (default: 3-hour, 2+1, 1+2)")
        print("  - Pattern preferences (prefer 3-hour blocks, allow split blocks)")
        print("  - Unit-specific weekly hour overrides")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    db_path = sys.argv[1] if len(sys.argv) > 1 else "./timetable.db"
    migrate_database(db_path)
