# Database Migration Scripts Archive

This folder contains one-time database migration scripts that have already been executed.

## Archived Migrations

1. **migrate_constraint_settings.py** - Added constraint settings columns (respect_lecturer_availability, balance_daily_load)
2. **migrate_max_lecturer_hours.py** - Added max_lecturer_hours_per_week column to settings table
3. **migrate_settings.py** - Added institutional_events column to settings table
4. **migrate_time_allocation.py** - Added time allocation fields and unit_weekly_overrides table

## Status

These scripts have been successfully applied to the database and are kept here for:
- Documentation purposes
- Reference for future migrations
- Rollback procedures if needed

**Do not delete** - These files provide historical context for database schema evolution.
