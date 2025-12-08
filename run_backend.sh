#!/bin/bash
# Add Python virtual environment to PATH
export PATH="$PWD/.pythonlibs/bin:$PATH"

# Start FastAPI backend
cd backend && exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
