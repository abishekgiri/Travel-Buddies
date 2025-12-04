import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './PhotoGallery.css';

const PhotoGallery = ({ tripId, userId }) => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [caption, setCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchPhotos();
    }, [tripId, userId]);

    const fetchPhotos = async () => {
        try {
            let url = `http://localhost:3000/api/photos/${tripId}`;
            if (userId) {
                url = `${API_URL}/api/photos/user?userId=${userId}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            if (data.photos) {
                setPhotos(data.photos);
            }
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('photo', selectedFile);
        formData.append('userId', user.id);
        formData.append('caption', caption);

        try {
            let url = `http://localhost:3000/api/photos/${tripId}`;
            if (userId) {
                url = `${API_URL}/api/photos/user`;
            }
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setPhotos([data.photo, ...photos]);
                setCaption('');
                setSelectedFile(null);
                // Reset file input
                document.getElementById('photo-upload').value = '';
            } else {
                alert('Failed to upload photo');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="photo-gallery loading">Loading photos...</div>;

    return (
        <div className="photo-gallery glass">
            <div className="gallery-header">
                <h3>📸 {userId ? 'My Photos' : 'Trip Photos'}</h3>
                <form className="upload-form" onSubmit={handleUpload}>
                    <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="photo-upload" className="btn-secondary upload-btn">
                        {selectedFile ? selectedFile.name : '+ Add Photo'}
                    </label>
                    {selectedFile && (
                        <>
                            <input
                                type="text"
                                placeholder="Caption..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="caption-input"
                            />
                            <button type="submit" className="btn-primary" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </>
                    )}
                </form>
            </div>

            <div className="photos-grid">
                {photos.length === 0 ? (
                    <p className="no-photos">No photos yet. Be the first to share a memory!</p>
                ) : (
                    photos.map((photo) => (
                        <div key={photo.id} className="photo-card">
                            <img
                                src={`${API_URL}${photo.url}`}
                                alt={photo.caption || 'Trip photo'}
                                onClick={() => window.open(`${API_URL}${photo.url}`, '_blank')}
                            />
                            <div className="photo-info">
                                <span className="photo-caption">{photo.caption}</span>
                                <span className="photo-user">by {photo.user_name}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PhotoGallery;
