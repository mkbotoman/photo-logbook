from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import os
import shutil
from datetime import datetime
from pathlib import Path
import re
from services.image_analyzer import ImageAnalyzer
from database import get_db, SessionLocal
import crud
from sqlalchemy.orm import Session

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

# Mount the uploads directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize image analyzer
image_analyzer = ImageAnalyzer()

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
    db: Session = Depends(get_db)
):
    if not group_title:
        raise HTTPException(status_code=400, detail="Group title is required")

    safe_title = sanitize_group_title(group_title)
    if not safe_title:
        raise HTTPException(status_code=400, detail="Invalid group title")

    # Create group directory with timestamp to ensure uniqueness
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    directory_name = f"{safe_title}_{timestamp}"
    group_dir = UPLOADS_DIR / directory_name
    group_dir.mkdir(parents=True, exist_ok=True)

    # Create group in database
    db_group = crud.create_image_group(db, group_title, directory_name)

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
            file_path = group_dir / saved_filename
            
            # Analyze the image
            analysis = await image_analyzer.analyze_image(file_path)
            
            # Create image record in database
            db_image = crud.create_image(
                db=db,
                group_id=db_group.id.__int__(),
                original_filename=file.filename or "unknown",
                stored_filename=saved_filename,
                content_type=content_type,
                file_size=os.path.getsize(file_path),
                metadata=analysis["metadata"],
                content_analysis=analysis["content_analysis"]
            )
            
            saved_files.append({
                "id": db_image.id,
                "original_name": file.filename,
                "saved_name": saved_filename,
                "content_type": content_type,
                "url": f"/uploads/{directory_name}/{saved_filename}",
                "directory_name": directory_name,
                "group": safe_title,
                "analysis": analysis
            })
        except Exception as e:
            errors.append(f"Failed to save {file.filename or 'Unknown file'}: {str(e)}")
    
    return JSONResponse(content={
        "group_title": group_title,
        "group_id": db_group.id,
        "directory_name": directory_name,
        "saved_files": saved_files,
        "errors": errors
    })

@app.get("/groups")
async def list_groups(db: Session = Depends(get_db)):
    """List all image groups."""
    groups = crud.get_all_image_groups(db)
    return {
        "groups": [
            {
                "id": group.id,
                "title": group.title,
                "file_count": len(group.images),
                "created_at": group.created_at.isoformat(),
            }
            for group in groups
        ]
    }

@app.get("/groups/{group_id}")
async def get_group(group_id: int, db: Session = Depends(get_db)):
    """Get details of a specific group."""
    group = crud.get_image_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return {
        "id": group.id,
        "title": group.title,
        "directory_name": group.directory_name,
        "created_at": group.created_at.isoformat(),
        "files": [
            {
                "id": image.id,
                "filename": image.stored_filename,
                "original_filename": image.original_filename,
                "url": f"/uploads/{group.directory_name}/{image.stored_filename}",
                "size": image.file_size,
                "uploaded_at": image.uploaded_at.isoformat(),
                "analysis": {
                    "metadata": {
                        "width": image.width,
                        "height": image.height,
                        "format": image.format,
                        "camera_make": image.camera_make,
                        "camera_model": image.camera_model,
                        "date_taken": image.date_taken.isoformat() if image.date_taken else None,
                        "gps": {
                            "latitude": float(image.gps_latitude) if image.gps_latitude else None,
                            "longitude": float(image.gps_longitude) if image.gps_longitude else None
                        } if image.gps_latitude and image.gps_longitude else None
                    },
                    "content_analysis": image.content_analysis
                }
            }
            for image in group.images
        ]
    } 