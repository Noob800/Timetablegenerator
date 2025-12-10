from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.routes import router

app = FastAPI(
    title="TimetableGen API",
    version="1.0.0",
    description="Automated Academic Timetable Generation System with Constraint Optimization"
)

# CORS Configuration - Restricted for security
# In production, replace with your actual frontend domain
ALLOWED_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://0.0.0.0:5000",
]

# Add wildcards for development on different network interfaces
if os.getenv("ENVIRONMENT", "development") == "development":
    ALLOWED_ORIGINS.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if os.getenv("ENVIRONMENT") != "development" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.get("/")
async def root():
    return {
        "message": "TimetableGen API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database_configured": os.getenv("DATABASE_URL") is not None,
        "service": "FastAPI Backend"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
