from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import os
import shutil
from datetime import datetime
from pathlib import Path

app = FastAPI()

# Allow CORS for frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure uploads directory
UPLOADS_DIR = Path("backend/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def save_upload_file(upload_file: UploadFile) -> str:
    """Save an uploaded file and return its saved filename."""
    if not upload_file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
        
    # Generate a unique filename using timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = Path(upload_file.filename).stem
    extension = Path(upload_file.filename).suffix
    new_filename = f"{original_name}_{timestamp}{extension}"
    
    file_path = UPLOADS_DIR / new_filename
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()
    
    return new_filename

@app.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    saved_files = []
    errors = []
    
    for file in files:
        # Validate file type (only allow images)
        content_type = file.content_type or ""
        if not content_type.startswith('image/'):
            errors.append(f"{file.filename or 'Unknown file'} is not an image file")
            continue
            
        try:
            saved_filename = save_upload_file(file)
            saved_files.append({
                "original_name": file.filename,
                "saved_name": saved_filename,
                "content_type": content_type
            })
        except Exception as e:
            errors.append(f"Failed to save {file.filename or 'Unknown file'}: {str(e)}")
    
    return JSONResponse(content={
        "saved_files": saved_files,
        "errors": errors
    })

@app.get("/uploads")
async def list_uploads():
    """List all uploaded files."""
    files = []
    for file_path in UPLOADS_DIR.glob("*.*"):  # Skip .gitkeep
        if file_path.name != ".gitkeep":
            files.append({
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
    return {"files": files} 