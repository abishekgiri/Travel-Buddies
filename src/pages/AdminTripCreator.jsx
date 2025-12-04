import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './AdminTripCreator.css';

const AdminTripCreator = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        maxTravelers: 10,
        description: '',
        imageUrl: '',
        activities: '' // Comma separated or new line separated
    });

    if (!user || user.role !== 'owner') {
        return (
            <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create the trip
            const tripResponse = await fetch(`${API_URL}/api/trips/admin/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    creator_id: user.id,
                    title: formData.title,
                    destination: formData.destination,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    budget: parseFloat(formData.budget),
                    max_travelers: parseInt(formData.maxTravelers),
                    description: formData.description,
                    image_url: formData.imageUrl,
                    activities: formData.activities.split('\n').filter(a => a.trim())
                })
            });

            const data = await tripResponse.json();

            if (data.success) {
                alert('Trip created successfully!');
                navigate(`/trips/${data.data.id}`);
            } else {
                alert('Failed to create trip: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('An error occurred while creating the trip.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-trip-creator-page">
            <div className="container">
                <div className="creator-card glass">
                    <div className="card-header">
                        <h2>👑 Create Curated Trip</h2>
                        <p>Design a unique experience for travelers</p>
                    </div>

                    <form onSubmit={handleSubmit} className="creator-form">
                        <div className="form-group">
                            <label>Trip Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Ultimate Tokyo Adventure"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Destination</label>
                                <input
                                    type="text"
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    placeholder="City, Country"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Budget ($)</label>
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    placeholder="2000"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Max Travelers (Seats)</label>
                            <input
                                type="number"
                                name="maxTravelers"
                                value={formData.maxTravelers}
                                onChange={handleChange}
                                min="1"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Image URL</label>
                            <input
                                type="url"
                                name="imageUrl"
                                value={formData.imageUrl}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        <div className="form-group">
                            <label>Description & Adventures</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the trip, adventures, and what makes it special..."
                                rows="4"
                                required
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label>Activities (One per line)</label>
                            <textarea
                                name="activities"
                                value={formData.activities}
                                onChange={handleChange}
                                placeholder="Day 1: Arrival&#10;Day 2: City Tour&#10;Day 3: Skydiving"
                                rows="5"
                            ></textarea>
                        </div>

                        <button type="submit" className="btn-primary-large" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Trip'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminTripCreator;
