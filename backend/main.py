from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI()

# Allow CORS for frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    filenames = []
    for file in files:
        contents = await file.read()
        # Here you could save the file, process it, etc.
        filenames.append(file.filename)
    return {"filenames": filenames} 