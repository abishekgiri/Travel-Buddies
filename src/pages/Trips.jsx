import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Trips.css';

const Trips = () => {
    const { user } = useAuth();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterDestination, setFilterDestination] = useState('');
    const [newTrip, setNewTrip] = useState({
        title: '',
        destination: '',
        start_date: '',
        end_date: '',
        budget: '',
        max_travelers: 10,
        description: ''
    });

    useEffect(() => {
        fetchTrips();
    }, [filterDestination]);

    const fetchTrips = async () => {
        try {
            const query = filterDestination ? `?destination=${filterDestination}` : '';
            const response = await fetch(`${API_URL}/api/trips${query}`);
            if (!response.ok) throw new Error('Failed to fetch trips');
            const data = await response.json();
            setTrips(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        try {
            // Geocode destination
            let lat = null;
            let lon = null;
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newTrip.destination)}`);
                const geoData = await geoRes.json();
                if (geoData && geoData.length > 0) {
                    lat = parseFloat(geoData[0].lat);
                    lon = parseFloat(geoData[0].lon);
                }
            } catch (geoErr) {
                console.error("Geocoding failed", geoErr);
            }

            const response = await fetch(`${API_URL}/api/trips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTrip,
                    creator_id: user.id,
                    latitude: lat,
                    longitude: lon
                })
            });

            if (!response.ok) throw new Error('Failed to create trip');

            setShowCreateModal(false);
            setNewTrip({
                title: '',
                destination: '',
                start_date: '',
                end_date: '',
                budget: '',
                max_travelers: 10,
                description: ''
            });
            fetchTrips();
        } catch (err) {
            console.error(err);
            alert('Failed to create trip');
        }
    };

    const handleJoinTrip = async (tripId) => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }

            alert('Successfully joined trip!');
            fetchTrips();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;

    return (
        <div className="trips-page container">
            <div className="trips-header">
                <div>
                    <h1>Explore <span className="text-gradient">Trips</span></h1>
                    <p>Find your next adventure or create one!</p>
                </div>
                {user && (
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        ✈️ Create Trip
                    </button>
                )}
            </div>

            <div className="trips-filters glass">
                <input
                    type="text"
                    placeholder="Search by destination..."
                    value={filterDestination}
                    onChange={(e) => setFilterDestination(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="trips-grid">
                {trips.map(trip => (
                    <div key={trip.id} className="trip-card glass">
                        <div className="trip-image">
                            <img
                                src={trip.image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(trip.destination)}%20scenic%20travel%204k%20wallpaper?width=400&height=200&nologo=true`}
                                alt={trip.title}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=200&fit=crop';
                                }}
                            />
                            <div className="trip-badge">{trip.status}</div>
                        </div>

                        <div className="trip-content">
                            <h3>{trip.title}</h3>
                            <p className="trip-destination">📍 {trip.destination}</p>

                            <div className="trip-details">
                                <div className="detail-item">
                                    <span className="label">Dates:</span>
                                    <span>{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
                                </div>
                                {trip.budget && (
                                    <div className="detail-item">
                                        <span className="label">Budget:</span>
                                        <span>${trip.budget}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span className="label">Travelers:</span>
                                    <span>{trip.member_count || 0} / {trip.max_travelers}</span>
                                </div>
                            </div>

                            <p className="trip-description">{trip.description}</p>

                            <div className="trip-creator">
                                <div className="creator-avatar">
                                    {trip.creator_avatar && (trip.creator_avatar.startsWith('/') || trip.creator_avatar.startsWith('http')) ? (
                                        <img
                                            src={trip.creator_avatar.startsWith('/') ? `${API_URL}${trip.creator_avatar}` : trip.creator_avatar}
                                            alt={trip.creator_name}
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        trip.creator_avatar || '👤'
                                    )}
                                </div>
                                <span>Created by {trip.creator_name}</span>
                            </div>

                            <div className="trip-actions">
                                <Link to={`/trips/${trip.id}`} className="btn-secondary">
                                    View Details
                                </Link>
                                {user && trip.creator_id !== user.id && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleJoinTrip(trip.id)}
                                    >
                                        Join Trip
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Trip</h2>
                        <form onSubmit={handleCreateTrip}>
                            <input
                                type="text"
                                placeholder="Trip Title"
                                value={newTrip.title}
                                onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Destination"
                                value={newTrip.destination}
                                onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                                required
                            />
                            <div className="date-inputs">
                                <input
                                    type="date"
                                    value={newTrip.start_date}
                                    onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                                    required
                                />
                                <input
                                    type="date"
                                    value={newTrip.end_date}
                                    onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                                    required
                                />
                            </div>
                            <input
                                type="number"
                                placeholder="Budget (optional)"
                                value={newTrip.budget}
                                onChange={(e) => setNewTrip({ ...newTrip, budget: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Max Travelers"
                                value={newTrip.max_travelers}
                                onChange={(e) => setNewTrip({ ...newTrip, max_travelers: e.target.value })}
                                min="2"
                                max="50"
                            />
                            <textarea
                                placeholder="Description"
                                value={newTrip.description}
                                onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                                rows="4"
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Create Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Trips;
