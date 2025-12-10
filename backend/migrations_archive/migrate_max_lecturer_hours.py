"""
Migration: Add max_lecturer_hours_per_week to Settings table
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'timetable.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(settings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'max_lecturer_hours_per_week' not in columns:
            print("Adding max_lecturer_hours_per_week column to settings table...")
            cursor.execute("""
                ALTER TABLE settings 
                ADD COLUMN max_lecturer_hours_per_week INTEGER DEFAULT 20
            """)
            conn.commit()
            print("✓ Successfully added max_lecturer_hours_per_week column")
        else:
            print("Column max_lecturer_hours_per_week already exists")
        
        # Update existing settings row if it exists
        cursor.execute("SELECT COUNT(*) FROM settings")
        if cursor.fetchone()[0] > 0:
            cursor.execute("""
                UPDATE settings 
                SET max_lecturer_hours_per_week = 20 
                WHERE max_lecturer_hours_per_week IS NULL
            """)
            conn.commit()
            print("✓ Updated existing settings with default value")
        
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
