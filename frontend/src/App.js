import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch groups on component mount
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:8000/groups');
      const data = await response.json();
      setGroups(data.groups);
    } catch (err) {
      setError('Failed to fetch groups');
      console.error('Error fetching groups:', err);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await fetch(`http://localhost:8000/groups/${groupId}`);
      const data = await response.json();
      setSelectedGroup(data);
    } catch (err) {
      setError('Failed to fetch group details');
      console.error('Error fetching group details:', err);
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!groupTitle.trim()) {
      setError('Please enter a group title');
      setLoading(false);
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('group_title', groupTitle);
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        setError(`Upload completed with errors: ${result.errors.join(', ')}`);
      }

      // Refresh groups list
      await fetchGroups();
      
      // Clear form
      setSelectedFiles([]);
      setGroupTitle('');
      
      // Select the newly created group
      await fetchGroupDetails(result.group_id);

    } catch (err) {
      setError('Failed to upload files');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderAnalysis = (analysis) => {
    if (!analysis) return null;

    return (
      <div className="analysis">
        <h4>Image Analysis</h4>
        <div className="metadata">
          <h5>Metadata</h5>
          <ul>
            {analysis.metadata.width && <li>Dimensions: {analysis.metadata.width} x {analysis.metadata.height}</li>}
            {analysis.metadata.format && <li>Format: {analysis.metadata.format}</li>}
            {analysis.metadata.camera_make && <li>Camera: {analysis.metadata.camera_make} {analysis.metadata.camera_model}</li>}
            {analysis.metadata.date_taken && <li>Date Taken: {formatDate(analysis.metadata.date_taken)}</li>}
            {analysis.metadata.gps && (
              <li>
                Location: {analysis.metadata.gps.latitude}, {analysis.metadata.gps.longitude}
                <a 
                  href={`https://www.google.com/maps?q=${analysis.metadata.gps.latitude},${analysis.metadata.gps.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-link"
                >
                  View on Map
                </a>
              </li>
            )}
          </ul>
        </div>
        {analysis.content_analysis && (
          <div className="content-analysis">
            <h5>Content Analysis</h5>
            <p>{analysis.content_analysis.description}</p>
            {analysis.content_analysis.tags && (
              <div className="tags">
                {analysis.content_analysis.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Photo Logbook</h1>
      </header>

      <main>
        <section className="upload-section">
          <h2>Upload New Images</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="groupTitle">Group Title:</label>
              <input
                type="text"
                id="groupTitle"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Enter a title for this group of images"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="files">Select Images:</label>
              <input
                type="file"
                id="files"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="groups-section">
          <h2>Image Groups</h2>
          <div className="groups-list">
            {groups.map(group => (
              <div 
                key={group.id}
                className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                onClick={() => fetchGroupDetails(group.id)}
              >
                <h3>{group.title}</h3>
                <p>{group.file_count} images</p>
                <p className="date">Created: {formatDate(group.created_at)}</p>
              </div>
            ))}
          </div>
        </section>

        {selectedGroup && (
          <section className="group-details">
            <h2>{selectedGroup.title}</h2>
            <p className="date">Created: {formatDate(selectedGroup.created_at)}</p>
            
            <div className="images-grid">
              {selectedGroup.files.map(file => (
                <div key={file.id} className="image-card">
                  <img 
                    src={`http://localhost:8000/uploads/${selectedGroup.directory_name}/${file.filename}`}
                    alt={file.original_filename}
                  />
                  <div className="image-info">
                    <h4>{file.original_filename}</h4>
                    <p>Uploaded: {formatDate(file.uploaded_at)}</p>
                    {renderAnalysis(file.analysis)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
