#!/bin/bash

echo "Starting FastAPI Backend Server..."
echo "Backend will run on http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

# Activate Python virtual environment created by uv
export PATH="$PWD/.pythonlibs/bin:$PATH"

# Start FastAPI with uvicorn
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
