import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResponse(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResponse(response.data);
    } catch (err) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Photo Logbook</h1>
        <div className="upload-container">
          <form onSubmit={handleSubmit}>
            <div className="file-input-container">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept="image/*"
                id="file-input"
              />
              <label htmlFor="file-input">
                {files.length > 0 
                  ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
                  : 'Choose Images'}
              </label>
            </div>
            <button 
              type="submit" 
              disabled={uploading || files.length === 0}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {response && response.saved_files && (
            <div className="success-message">
              <h3>Upload Successful!</h3>
              <p>Uploaded files:</p>
              <ul>
                {response.saved_files.map((file, index) => (
                  <li key={index}>
                    {file.original_name} → {file.saved_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
