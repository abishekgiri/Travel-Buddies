import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EditProfileForm from '../components/EditProfileForm';
import PhotoGallery from '../components/PhotoGallery';
import { API_URL } from '../config';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const { userId } = useParams(); // Get userId from URL
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    // Determine if we are viewing our own profile
    const isOwnProfile = !userId || (user && user.id === parseInt(userId));
    const targetUserId = userId ? parseInt(userId) : user?.id;

    useEffect(() => {
        if (targetUserId) {
            fetchProfile();
        }
    }, [targetUserId]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/${targetUserId}`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            setProfileData(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        fetchProfile();
        setEditMode(false);
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingCover(true);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', user.id);
        formData.append('caption', 'Cover Photo');

        try {
            const uploadRes = await fetch(`${API_URL}/api/photos/user`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                const updateRes = await fetch(`${API_URL}/api/users/${user.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ cover_photo: uploadData.photo.url })
                });

                if (updateRes.ok) {
                    fetchProfile();
                } else {
                    alert('Failed to update cover photo');
                }
            } else {
                alert('Failed to upload photo');
            }
        } catch (err) {
            console.error(err);
            alert('Error uploading cover photo');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleMessage = () => {
        // Navigate to chat with this user
        // Ideally, we would create a conversation first, but for now let's just go to chat
        // and let the user select them from the list if they exist, or we could pass state
        navigate('/chat', { state: { startChatWith: profileData } });
    };

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;
    if (error) return <div className="container" style={{ paddingTop: '100px' }}>Error: {error}</div>;
    if (!profileData) return null;

    if (editMode && isOwnProfile) {
        return (
            <div className="profile-page container">
                <EditProfileForm
                    user={user}
                    initialData={profileData}
                    onSave={handleSave}
                    onCancel={() => setEditMode(false)}
                />
            </div>
        );
    }

    return (
        <div className="profile-page container">
            <div className="profile-header glass">
                <div
                    className="cover-photo"
                    style={{
                        backgroundImage: profileData.cover_photo ? `url(${API_URL}${profileData.cover_photo})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {isOwnProfile && (
                        <label className="edit-cover-btn btn-secondary">
                            {uploadingCover ? 'Uploading...' : '📷 Edit Cover'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverUpload}
                                style={{ display: 'none' }}
                                disabled={uploadingCover}
                            />
                        </label>
                    )}
                </div>
                <div className="profile-info-container">
                    <div className="profile-avatar-container">
                        <div className="profile-avatar">
                            {profileData.avatar && profileData.avatar.startsWith('/uploads') ? (
                                <img src={`${API_URL}${profileData.avatar}`} alt={profileData.name} />
                            ) : (
                                <span>{profileData.avatar || '👤'}</span>
                            )}
                        </div>
                    </div>
                    <div className="profile-details">
                        <div className="name-section">
                            <h1>{profileData.name}</h1>
                            <span className="location">📍 {profileData.location}</span>
                            {profileData.role === 'owner' && <span className="tag" style={{ background: 'gold', color: 'black', marginLeft: '10px' }}>Owner</span>}
                        </div>
                        <p className="bio">
                            {profileData.bio || 'No bio yet.'}
                        </p>

                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-label">Age</span>
                                <span className="stat-value">{profileData.age}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Status</span>
                                <span className="stat-value">{profileData.relationship_status || 'N/A'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Religion</span>
                                <span className="stat-value">{profileData.religious_views || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="interests-section">
                            <h3>Interests</h3>
                            <div className="interests-tags">
                                {(profileData.interests || []).map((tag, i) => (
                                    <span key={i} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>

                        <div className="interests-section" style={{ marginTop: '1rem' }}>
                            <h3>Likes</h3>
                            <div className="interests-tags">
                                {(profileData.likes || []).map((tag, i) => (
                                    <span key={i} className="tag" style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' }}>{tag}</span>
                                ))}
                            </div>
                        </div>

                        <div className="interests-section" style={{ marginTop: '1rem' }}>
                            <h3>Dislikes</h3>
                            <div className="interests-tags">
                                {(profileData.dislikes || []).map((tag, i) => (
                                    <span key={i} className="tag" style={{ background: 'rgba(248, 113, 113, 0.2)', color: '#f87171' }}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="profile-actions">
                        {isOwnProfile ? (
                            <button className="btn-primary" onClick={() => setEditMode(true)}>
                                Edit Profile
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={handleMessage}>
                                Message
                            </button>
                        )}

                        {user.role === 'owner' && !isOwnProfile && (
                            <button
                                className="btn-secondary"
                                style={{ marginLeft: '1rem', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                        try {
                                            const response = await fetch(`${API_URL}/api/users/${profileData.id}`, {
                                                method: 'DELETE',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                },
                                                body: JSON.stringify({ requester_id: user.id })
                                            });
                                            if (response.ok) {
                                                alert('User deleted successfully');
                                                window.location.href = '/';
                                            } else {
                                                const data = await response.json();
                                                alert(data.error || 'Failed to delete user');
                                            }
                                        } catch (err) {
                                            alert(err.message);
                                        }
                                    }
                                }}
                            >
                                Delete User
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <PhotoGallery userId={targetUserId} />
        </div>
    );
};

export default Profile;
