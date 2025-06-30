# Photo Logbook

A full-stack application for uploading and managing photos, built with React (frontend) and FastAPI (backend).

## Project Structure

```
photo-logbook/
├── backend/         # FastAPI backend
│   ├── main.py     # Main FastAPI application
│   └── requirements.txt
└── frontend/       # React frontend
    ├── src/
    ├── public/
    └── package.json
```

## Setup & Running

### Backend (FastAPI)

1. Create and activate a Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Run the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at http://localhost:8000

### Frontend (React)

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

The frontend will be available at http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Click "Choose Images" to select one or more image files
3. Click "Upload" to send the files to the backend
4. The response will show the list of successfully uploaded files

## Development

- Backend API documentation is available at http://localhost:8000/docs
- The frontend is built using Create React App and can be customized as needed
- CORS is configured to allow requests between the frontend and backend 