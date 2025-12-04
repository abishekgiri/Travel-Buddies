import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import ImageUpload from './ImageUpload';
import './EditProfileForm.css';

const EditProfileForm = ({ user, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        email: initialData.email || '',
        location: initialData.location || '',
        destination: initialData.destination || '',
        age: initialData.age || '',
        bio: initialData.bio || '',
        phone: initialData.phone || '',
        relationship_status: initialData.relationship_status || '',
        religious_views: initialData.religious_views || '',
        interests: (initialData.interests || []).join(', '),
        likes: (initialData.likes || []).join(', '),
        dislikes: (initialData.dislikes || []).join(', '),
        adventures: (initialData.adventures || []).join(', '),
        avatar: initialData.avatar || ''
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (value) => {
        setFormData(prev => ({ ...prev, phone: value }));
    };

    const handleImageUpload = (data) => {
        // Update avatar in form data immediately
        setFormData(prev => ({ ...prev, avatar: data.url }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert comma-separated strings back to arrays
            const processedData = {
                ...formData,
                interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean),
                likes: formData.likes.split(',').map(s => s.trim()).filter(Boolean),
                dislikes: formData.dislikes.split(',').map(s => s.trim()).filter(Boolean),
                adventures: formData.adventures.split(',').map(s => s.trim()).filter(Boolean),
                age: parseInt(formData.age) || null
            };

            const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(processedData)
            });

            if (!response.ok) throw new Error('Failed to update profile');

            onSave();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edit-profile-form glass">
            <h2>Edit Profile</h2>

            <div className="form-section avatar-section">
                <ImageUpload
                    type="profile"
                    userId={user.id}
                    currentImage={formData.avatar}
                    onUpload={handleImageUpload}
                />
                <p className="helper-text">Click image to update avatar</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <PhoneInput
                            country={'us'}
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            inputStyle={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' }}
                            buttonStyle={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                            dropdownStyle={{ background: '#242424', color: 'white' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Age</label>
                        <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Current Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Dream Destination</label>
                        <input
                            type="text"
                            name="destination"
                            value={formData.destination}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Relationship Status</label>
                        <select name="relationship_status" value={formData.relationship_status} onChange={handleChange}>
                            <option value="">Select...</option>
                            <option value="Single">Single</option>
                            <option value="In a relationship">In a relationship</option>
                            <option value="Married">Married</option>
                            <option value="It's complicated">It's complicated</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Religious Views</label>
                        <input
                            type="text"
                            name="religious_views"
                            value={formData.religious_views}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-group full-width">
                    <label>Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows="4"
                    />
                </div>

                <div className="form-group full-width">
                    <label>Interests (comma separated)</label>
                    <input
                        type="text"
                        name="interests"
                        value={formData.interests}
                        onChange={handleChange}
                        placeholder="Travel, Music, Photography..."
                    />
                </div>

                <div className="form-group full-width">
                    <label>Likes (comma separated)</label>
                    <input
                        type="text"
                        name="likes"
                        value={formData.likes}
                        onChange={handleChange}
                        placeholder="Pizza, Sunsets, Dogs..."
                    />
                </div>

                <div className="form-group full-width">
                    <label>Dislikes (comma separated)</label>
                    <input
                        type="text"
                        name="dislikes"
                        value={formData.dislikes}
                        onChange={handleChange}
                        placeholder="Traffic, Rain, Rude people..."
                    />
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfileForm;
