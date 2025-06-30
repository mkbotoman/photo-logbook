import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('http://localhost:8000/groups');
      setGroups(response.data.groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await axios.get(`http://localhost:8000/groups/${groupId}`);
      setSelectedGroup(response.data);
      setSelectedImage(null); // Reset selected image when changing groups
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    }
  };

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

    if (!groupTitle.trim()) {
      setError('Please enter a group title');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('group_title', groupTitle);
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
      setGroupTitle('');
      setFiles([]);
      fetchGroups(); // Refresh the groups list
    } catch (err) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (isoDate) => {
    return new Date(isoDate).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMetadata = (metadata) => {
    if (!metadata) return null;

    return (
      <div className="metadata-section">
        <h4>Image Details</h4>
        <div className="metadata-grid">
          {metadata.date_taken && (
            <div className="metadata-item">
              <span className="label">Date Taken:</span>
              <span>{formatDate(metadata.date_taken)}</span>
            </div>
          )}
          <div className="metadata-item">
            <span className="label">Dimensions:</span>
            <span>{metadata.width} × {metadata.height}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Size:</span>
            <span>{formatFileSize(metadata.file_size)}</span>
          </div>
          {metadata.camera_make && (
            <div className="metadata-item">
              <span className="label">Camera:</span>
              <span>{metadata.camera_make} {metadata.camera_model}</span>
            </div>
          )}
          {metadata.gps && (
            <div className="metadata-item">
              <span className="label">Location:</span>
              <span>
                <a 
                  href={`https://www.google.com/maps?q=${metadata.gps.latitude},${metadata.gps.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Map
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnalysis = (analysis) => {
    if (!analysis || !analysis.content_analysis) return null;

    let content;
    try {
      content = typeof analysis.content_analysis === 'string' 
        ? JSON.parse(analysis.content_analysis)
        : analysis.content_analysis;
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      return null;
    }

    return (
      <div className="analysis-section">
        <h4>AI Analysis</h4>
        <div className="analysis-content">
          {content.description && (
            <div className="analysis-item">
              <span className="label">Description:</span>
              <p>{content.description}</p>
            </div>
          )}
          {content.location_type && (
            <div className="analysis-item">
              <span className="label">Location Type:</span>
              <p>{content.location_type}</p>
            </div>
          )}
          {content.time_and_weather && (
            <div className="analysis-item">
              <span className="label">Time & Weather:</span>
              <p>{content.time_and_weather}</p>
            </div>
          )}
          {content.activities && (
            <div className="analysis-item">
              <span className="label">Activities:</span>
              <p>{content.activities}</p>
            </div>
          )}
          {content.key_objects && (
            <div className="analysis-item">
              <span className="label">Key Elements:</span>
              <p>{content.key_objects}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Photo Logbook</h1>
        <div className="main-container">
          <div className="upload-container">
            <h2>Upload New Photos</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Enter group title"
                  className="title-input"
                />
              </div>
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
                disabled={uploading || files.length === 0 || !groupTitle.trim()}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {response && (
              <div className="response-container">
                {response.errors && response.errors.length > 0 && (
                  <div className="error-message">
                    <h3>Errors:</h3>
                    <ul>
                      {response.errors.map((error, index) => (
                        <li key={`error-${index}`}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {response.saved_files && response.saved_files.length > 0 && (
                  <div className="success-message">
                    <h3>Successfully Uploaded to Group: {response.group_title}</h3>
                    <ul>
                      {response.saved_files.map((file, index) => (
                        <li key={`file-${index}`}>
                          {file.original_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="groups-container">
            <h2>Photo Groups</h2>
            <div className="groups-list">
              {groups.map(group => (
                <div 
                  key={group.id} 
                  className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                  onClick={() => fetchGroupDetails(group.id)}
                >
                  <h3>{group.title}</h3>
                  <p>{group.file_count} photos</p>
                  <p className="date">{formatDate(group.created_at)}</p>
                </div>
              ))}
            </div>

            {selectedGroup && (
              <div className="group-details">
                <h3>{selectedGroup.title}</h3>
                <p>Created: {formatDate(selectedGroup.created_at)}</p>
                <div className="files-list">
                  {selectedGroup.files.map((file, index) => (
                    <div 
                      key={index} 
                      className={`file-item ${selectedImage === file ? 'selected' : ''}`}
                      onClick={() => setSelectedImage(file)}
                    >
                      <p>{file.filename}</p>
                      <p className="file-info">
                        Size: {formatFileSize(file.size)}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedImage && (
                  <div className="image-analysis">
                    <h3>Image Analysis</h3>
                    {renderMetadata(selectedImage.analysis.metadata)}
                    {renderAnalysis(selectedImage.analysis)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
