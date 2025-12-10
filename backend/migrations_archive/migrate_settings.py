"""
Migration script to add institutional_events column to existing settings table
"""
from sqlalchemy import text
from database import engine, SessionLocal, Settings

def migrate_settings():
    """Add institutional_events column if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column exists
        try:
            result = conn.execute(text("PRAGMA table_info(settings)"))
            columns = [row[1] for row in result]
            
            if 'institutional_events' not in columns:
                print("Adding institutional_events column...")
                # Add the column
                conn.execute(text("""
                    ALTER TABLE settings 
                    ADD COLUMN institutional_events TEXT
                """))
                conn.commit()
                print("Column added successfully")
                
                # Update existing records with default values
                db = SessionLocal()
                try:
                    settings = db.query(Settings).first()
                    if settings:
                        settings.institutional_events = [
                            {"name": "Monday Devotion", "day": "Monday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                            {"name": "Thursday Devotion", "day": "Thursday", "start_time": "07:00", "end_time": "08:00", "enabled": True, "color": "purple"},
                            {"name": "Wednesday Sports", "day": "Wednesday", "start_time": "16:00", "end_time": "18:00", "enabled": True, "color": "orange"}
                        ]
                        db.commit()
                        print("Updated existing settings with default events")
                finally:
                    db.close()
            else:
                print("institutional_events column already exists")
        except Exception as e:
            print(f"Migration error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate_settings()
    print("Migration complete!")
