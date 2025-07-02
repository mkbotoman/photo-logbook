import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploadedGroup, setUploadedGroup] = useState(null);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    
    // Create preview URLs for the dropped files
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { type: 'local', url }]);
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    
    // Create preview URLs for the selected files
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { type: 'local', url }]);
    });
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
      console.log('Upload response:', result);
      
      if (result.errors && result.errors.length > 0) {
        setError(`Upload completed with errors: ${result.errors.join(', ')}`);
      }

      // Update preview URLs with server URLs
      const serverUrls = result.saved_files.map(file => {
        console.log('Processing file:', file);
        const imageUrl = file.url.startsWith('http') ? file.url : `http://localhost:8000${file.url}`;
        return {
          type: 'server',
          url: imageUrl,
          analysis: file.analysis
        };
      });

      console.log('Server URLs:', serverUrls);
      setPreviewUrls(serverUrls);
      setUploadedGroup(result);
      
      // Clear form
      setSelectedFiles([]);
      setGroupTitle('');
      
    } catch (err) {
      setError('Failed to upload files');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    const removedPreview = previewUrls[index];
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    // Clean up object URL if it's a local preview
    if (removedPreview.type === 'local') {
      URL.revokeObjectURL(removedPreview.url);
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
        <h1>Travel Blog Post Generator</h1>
        <p className="subtitle">Your memories, your words—auto-written.</p>
      </header>

      <main>
        <section className="upload-section">
          <div 
            className="dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="dropzone-content">
              <img src="/placeholder-image.svg" alt="Upload icon" className="upload-icon" />
              <p>Drag and drop images here</p>
              <button className="select-button" onClick={() => document.getElementById('file-input').click()}>
                Select Images
              </button>
              <input
                type="file"
                id="file-input"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {previewUrls.length > 0 && (
            <div className="preview-section">
              {previewUrls.map((preview, index) => (
                <div key={index} className="preview-image-container">
                  <img src={preview.url} alt={`Preview ${index + 1}`} className="preview-image" />
                  {preview.type === 'local' && (
                    <button 
                      className="remove-image" 
                      onClick={() => removeImage(index)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Enter your blog post title"
                required
              />
            </div>

            <button type="submit" disabled={loading || selectedFiles.length === 0}>
              {loading ? 'Generating...' : 'Generate Blog Post'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}
        </section>

        {uploadedGroup && previewUrls.length > 0 && (
          <section className="blog-post-section">
            <h2>Blog Post</h2>
            <div className="blog-post-preview">
              {previewUrls.map((preview, index) => (
                <div key={index} className="blog-post-item">
                  <img src={preview.url} alt={`Blog post ${index + 1}`} className="blog-image" />
                  <div className="blog-content">
                    {preview.type === 'server' && preview.analysis ? (
                      <div className="metadata-content">
                        <h3>Image Analysis</h3>
                        <div className="metadata">
                          <h4>Technical Details</h4>
                          <ul>
                            {preview.analysis.metadata.width && (
                              <li>Dimensions: {preview.analysis.metadata.width} x {preview.analysis.metadata.height}</li>
                            )}
                            {preview.analysis.metadata.format && (
                              <li>Format: {preview.analysis.metadata.format}</li>
                            )}
                            {preview.analysis.metadata.camera_make && (
                              <li>Camera: {preview.analysis.metadata.camera_make} {preview.analysis.metadata.camera_model}</li>
                            )}
                            {preview.analysis.metadata.date_taken && (
                              <li>Date Taken: {new Date(preview.analysis.metadata.date_taken).toLocaleString()}</li>
                            )}
                            {preview.analysis.metadata.gps && (
                              <li>
                                Location: {preview.analysis.metadata.gps.latitude}, {preview.analysis.metadata.gps.longitude}
                                <a 
                                  href={`https://www.google.com/maps?q=${preview.analysis.metadata.gps.latitude},${preview.analysis.metadata.gps.longitude}`}
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
                        {preview.analysis.content_analysis && !preview.analysis.content_analysis.error && (
                          <div className="content-analysis">
                            <h4>Scene Analysis</h4>
                            {preview.analysis.content_analysis.description && (
                              <div className="analysis-section">
                                <h5>Description</h5>
                                <p>{preview.analysis.content_analysis.description}</p>
                              </div>
                            )}
                            {preview.analysis.content_analysis.location_type && (
                              <div className="analysis-section">
                                <h5>Location</h5>
                                <p>{preview.analysis.content_analysis.location_type}</p>
                              </div>
                            )}
                            {preview.analysis.content_analysis.time_and_weather && (
                              <div className="analysis-section">
                                <h5>Time & Weather</h5>
                                <p>{preview.analysis.content_analysis.time_and_weather}</p>
                              </div>
                            )}
                            {preview.analysis.content_analysis.key_elements && (
                              <div className="analysis-section">
                                <h5>Key Elements</h5>
                                <ul>
                                  {preview.analysis.content_analysis.key_elements.map((element, i) => (
                                    <li key={i}>{element}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {preview.analysis.content_analysis.activities && (
                              <div className="analysis-section">
                                <h5>Activities</h5>
                                <ul>
                                  {preview.analysis.content_analysis.activities.map((activity, i) => (
                                    <li key={i}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {preview.analysis.content_analysis?.error && (
                          <div className="error-message">
                            <p>Failed to analyze image content: {preview.analysis.content_analysis.error}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="metadata-placeholder">
                        <div className="placeholder-line"></div>
                        <div className="placeholder-line"></div>
                        <div className="placeholder-line"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
