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
                    <div key={index} className="file-item">
                      <p>{file.filename}</p>
                      <p className="file-info">
                        Size: {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
