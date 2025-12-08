#!/bin/bash

# Install Python dependencies if not already installed
if [ ! -d "$HOME/.local/lib/python3.11/site-packages/fastapi" ]; then
    echo "Installing Python dependencies..."
    python3.11 -m pip install --user -r backend/requirements.txt
fi

# Start FastAPI backend
echo "Starting FastAPI backend on port 8000..."
cd backend && python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
