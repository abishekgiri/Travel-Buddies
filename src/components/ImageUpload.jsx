import React, { useRef, useState } from 'react';
import { API_URL } from '../config';
import './ImageUpload.css';

const ImageUpload = ({ onUpload, type = 'profile', currentImage, userId, tripId }) => {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(currentImage || null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = (file) => {
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload file
        uploadFile(file);
    };

    const uploadFile = async (file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type === 'profile' ? 'profiles' : 'trips');
        formData.append('userId', userId);
        if (tripId) formData.append('tripId', tripId);

        try {
            const endpoint = type === 'profile' ? '/api/upload/profile' : '/api/upload/trip';
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            if (onUpload) onUpload(data);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="image-upload">
            <div
                className={`upload-area ${dragActive ? 'drag-active' : ''} ${preview ? 'has-image' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {preview ? (
                    <div className="preview-container">
                        <img src={preview.startsWith('http') ? preview : `${API_URL}${preview}`} alt="Preview" />
                        {uploading && (
                            <div className="upload-overlay">
                                <div className="spinner"></div>
                                <p>Uploading...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">📷</div>
                        <p>Click or drag image here</p>
                        <span>JPG, PNG, GIF up to 5MB</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default ImageUpload;
