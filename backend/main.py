from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import os
import shutil
from datetime import datetime
from pathlib import Path
import re

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure uploads directory
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def sanitize_group_title(title: str) -> str:
    """Convert group title to a safe directory name."""
    # Replace spaces with underscores and remove special characters
    safe_title = re.sub(r'[^\w\s-]', '', title)
    safe_title = re.sub(r'[-\s]+', '_', safe_title).strip('-_')
    return safe_title

def save_upload_file(upload_file: UploadFile, group_dir: Path) -> str:
    """Save an uploaded file and return its saved filename."""
    if not upload_file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
        
    # Generate a unique filename using timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = Path(upload_file.filename).stem
    extension = Path(upload_file.filename).suffix
    new_filename = f"{original_name}_{timestamp}{extension}"
    
    file_path = group_dir / new_filename
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()
    
    return new_filename

@app.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...),
    group_title: str = Form(...),
):
    if not group_title:
        raise HTTPException(status_code=400, detail="Group title is required")

    safe_title = sanitize_group_title(group_title)
    if not safe_title:
        raise HTTPException(status_code=400, detail="Invalid group title")

    # Create group directory with timestamp to ensure uniqueness
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    group_dir = UPLOADS_DIR / f"{safe_title}_{timestamp}"
    group_dir.mkdir(parents=True, exist_ok=True)

    saved_files = []
    errors = []
    
    for file in files:
        # Validate file type (only allow images)
        content_type = file.content_type or ""
        if not content_type.startswith('image/'):
            errors.append(f"{file.filename or 'Unknown file'} is not an image file")
            continue
            
        try:
            saved_filename = save_upload_file(file, group_dir)
            saved_files.append({
                "original_name": file.filename,
                "saved_name": saved_filename,
                "content_type": content_type,
                "group": safe_title
            })
        except Exception as e:
            errors.append(f"Failed to save {file.filename or 'Unknown file'}: {str(e)}")
    
    return JSONResponse(content={
        "group_title": group_title,
        "group_id": f"{safe_title}_{timestamp}",
        "saved_files": saved_files,
        "errors": errors
    })

@app.get("/groups")
async def list_groups():
    """List all image groups."""
    groups = []
    for group_dir in UPLOADS_DIR.iterdir():
        if group_dir.is_dir() and not group_dir.name.startswith('.'):
            # Get group info
            group_name = group_dir.name
            files = list(group_dir.glob("*.*"))
            created_at = datetime.fromtimestamp(group_dir.stat().st_mtime)
            
            # Extract original title from directory name (remove timestamp)
            original_title = "_".join(group_name.split("_")[:-1])
            
            groups.append({
                "id": group_name,
                "title": original_title,
                "file_count": len(files),
                "created_at": created_at.isoformat(),
            })
    
    # Sort groups by creation date, newest first
    groups.sort(key=lambda x: x["created_at"], reverse=True)
    return {"groups": groups}

@app.get("/groups/{group_id}")
async def get_group(group_id: str):
    """Get details of a specific group."""
    group_dir = UPLOADS_DIR / group_id
    if not group_dir.exists() or not group_dir.is_dir():
        raise HTTPException(status_code=404, detail="Group not found")

    files = []
    for file_path in group_dir.glob("*.*"):
        files.append({
            "filename": file_path.name,
            "size": file_path.stat().st_size,
            "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        })

    # Sort files by upload date
    files.sort(key=lambda x: x["uploaded_at"], reverse=True)
    
    return {
        "id": group_id,
        "title": "_".join(group_id.split("_")[:-1]),  # Remove timestamp
        "created_at": datetime.fromtimestamp(group_dir.stat().st_mtime).isoformat(),
        "files": files
    } 