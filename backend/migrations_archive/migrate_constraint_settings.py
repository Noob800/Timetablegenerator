"""
Migration script to add constraint settings columns to Settings table.
Adds: respect_lecturer_availability, balance_daily_load
"""

import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(__file__), "timetable.db")

def migrate():
    print("Starting migration: Adding constraint settings columns...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(settings)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add respect_lecturer_availability column if it doesn't exist
        if 'respect_lecturer_availability' not in columns:
            print("Adding column: respect_lecturer_availability")
            cursor.execute("""
                ALTER TABLE settings 
                ADD COLUMN respect_lecturer_availability BOOLEAN DEFAULT 0
            """)
            print("✓ Added column: respect_lecturer_availability")
        else:
            print("⊗ Column already exists: respect_lecturer_availability")
        
        # Add balance_daily_load column if it doesn't exist
        if 'balance_daily_load' not in columns:
            print("Adding column: balance_daily_load")
            cursor.execute("""
                ALTER TABLE settings 
                ADD COLUMN balance_daily_load BOOLEAN DEFAULT 1
            """)
            print("✓ Added column: balance_daily_load")
        else:
            print("⊗ Column already exists: balance_daily_load")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
