import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './TransportSearch.css';

const TransportSearch = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useState({
        type: 'flight',
        from: '',
        to: '',
        date: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const query = new URLSearchParams(searchParams).toString();
            const response = await fetch(`${API_URL}/api/transport/search?${query}`);
            const data = await response.json();
            if (data.success) {
                setResults(data.data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (journey) => {
        if (!user) return alert('Please login to join a trip');
        setJoining(journey.transport_number);
        try {
            const response = await fetch(`${API_URL}/api/transport/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, journey })
            });
            const data = await response.json();
            if (data.success) {
                alert('You have joined this trip! You can now see other buddies.');
                // Refresh results to update member count
                handleSearch({ preventDefault: () => { } });
            }
        } catch (error) {
            console.error('Join error:', error);
        } finally {
            setJoining(null);
        }
    };

    return (
        <div className="transport-page">
            <div className="container">
                <div className="search-card glass">
                    <h2>Find Your Travel Buddies</h2>
                    <p>Search for your flight, train, or bus to see who else is going!</p>

                    <div className="transport-tabs">
                        {['flight', 'train', 'bus'].map(type => (
                            <button
                                key={type}
                                className={`tab-btn ${searchParams.type === type ? 'active' : ''}`}
                                onClick={() => setSearchParams({ ...searchParams, type })}
                            >
                                {type === 'flight' ? '✈️ Flight' : type === 'train' ? '🚆 Train' : '🚌 Bus'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSearch} className="search-form">
                        <div className="form-group">
                            <label>From</label>
                            <input
                                type="text"
                                placeholder={searchParams.type === 'flight' ? "New York, JFK, London..." : "London, Paris..."}
                                value={searchParams.from}
                                onChange={e => setSearchParams({ ...searchParams, from: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>To</label>
                            <input
                                type="text"
                                placeholder={searchParams.type === 'flight' ? "Tokyo, Dubai, Sydney..." : "Paris, Rome..."}
                                value={searchParams.to}
                                onChange={e => setSearchParams({ ...searchParams, to: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={searchParams.date}
                                onChange={e => setSearchParams({ ...searchParams, date: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>

                <div className="results-grid">
                    {results.map((journey, index) => (
                        <div key={index} className="journey-card glass">
                            <div className="journey-header">
                                <span className="carrier-badge">{journey.carrier}</span>
                                <span className="transport-number">#{journey.transport_number}</span>
                            </div>
                            <div className="journey-route">
                                <div className="route-point">
                                    <span className="time">{new Date(journey.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="city">{journey.departure_location}</span>
                                </div>
                                <div className="route-line">
                                    <span className="duration">{Math.floor(journey.duration / 60)}h {journey.duration % 60}m</span>
                                    <div className="line"></div>
                                </div>
                                <div className="route-point">
                                    <span className="time">{new Date(journey.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="city">{journey.arrival_location}</span>
                                </div>
                            </div>

                            <div className="journey-footer">
                                <div className="buddies-info">
                                    <span className="buddy-count">👥 {journey.member_count} Buddies</span>
                                    {journey.member_count > 0 && <span className="active-dot"></span>}
                                </div>
                                <button
                                    className="btn-secondary-sm"
                                    onClick={() => handleJoin(journey)}
                                    disabled={joining === journey.transport_number}
                                >
                                    {joining === journey.transport_number ? 'Joining...' : "I'm on this trip!"}
                                </button>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && !loading && (
                        <div className="empty-state">
                            <p>No trips found. Try searching for major routes!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransportSearch;
