import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import MapView from '../components/MapView';
import './FindTravelers.css';

const FindTravelers = () => {
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInterest, setFilterInterest] = useState('');
    const [filterBudget, setFilterBudget] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [travelers, setTravelers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, tripsRes] = await Promise.all([
                fetch(`${API_URL}/api/users`),
                fetch(`${API_URL}/api/trips`)
            ]);

            if (!usersRes.ok) throw new Error('Failed to fetch travelers');
            if (!tripsRes.ok) throw new Error('Failed to fetch trips');

            const usersData = await usersRes.json();
            const tripsData = await tripsRes.json();

            setTravelers(usersData.data);
            setTrips(tripsData.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateMatchScore = (traveler) => {
        if (!currentUser) return 0;
        let score = 0;

        // Interest Match (40%)
        const userInterests = currentUser.interests || [];
        const travelerInterests = traveler.interests || [];
        const commonInterests = userInterests.filter(i => travelerInterests.includes(i));
        if (userInterests.length > 0) {
            score += (commonInterests.length / userInterests.length) * 40;
        }

        // Destination Match (30%)
        if (currentUser.destination && traveler.destination &&
            currentUser.destination.toLowerCase() === traveler.destination.toLowerCase()) {
            score += 30;
        }

        // Location Proximity (10%) - Simplified check
        if (currentUser.location && traveler.location &&
            currentUser.location.toLowerCase() === traveler.location.toLowerCase()) {
            score += 10;
        }

        // Random compatibility factor for demo (20%)
        score += Math.floor(Math.random() * 20);

        return Math.min(Math.round(score), 100);
    };

    const handleConnect = (traveler) => {
        localStorage.setItem('selectedTraveler', JSON.stringify(traveler));
        navigate('/chat');
    };

    const handleSaveProfile = (travelerId) => {
        alert('Profile saved to favorites!');
    };

    const handleAddFriend = (travelerId) => {
        alert('Friend request sent!');
    };

    const filteredTravelers = travelers
        .filter(traveler => traveler.id !== currentUser?.id) // Exclude self
        .filter(traveler => {
            const matchesSearch = (traveler.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (traveler.location || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesInterest = filterInterest ? (traveler.interests || []).includes(filterInterest) : true;
            const matchesBudget = filterBudget ? (traveler.budget_range === filterBudget) : true; // Assuming budget_range exists or similar
            const matchesGender = filterGender ? (traveler.gender === filterGender) : true;

            return matchesSearch && matchesInterest && matchesBudget && matchesGender;
        })
        .map(traveler => ({
            ...traveler,
            matchScore: calculateMatchScore(traveler)
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

    const allInterests = [...new Set(travelers.flatMap(t => t.interests || []))];

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;
    if (error) return <div className="container" style={{ paddingTop: '100px' }}>Error: {error}</div>;

    return (
        <div className="find-travelers-page container">
            <div className="header-section">
                <div>
                    <h1 className="page-title">Find Your <span className="text-gradient">Travel Buddy</span></h1>
                    <p className="page-subtitle">Connect with travelers heading your way.</p>
                </div>
                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        List View
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
                        onClick={() => setViewMode('map')}
                    >
                        Map View
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    <div className="filters-section glass">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by destination or location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <select value={filterInterest} onChange={(e) => setFilterInterest(e.target.value)}>
                                <option value="">All Interests</option>
                                {allInterests.map(interest => (
                                    <option key={interest} value={interest}>{interest}</option>
                                ))}
                            </select>
                            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                <option value="">Any Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                            </select>
                            <select value={filterBudget} onChange={(e) => setFilterBudget(e.target.value)}>
                                <option value="">Any Budget</option>
                                <option value="Low">Low ($0 - $1000)</option>
                                <option value="Medium">Medium ($1000 - $3000)</option>
                                <option value="High">High ($3000+)</option>
                            </select>
                        </div>
                    </div>

                    <div className="travelers-grid">
                        {filteredTravelers.map(traveler => (
                            <div key={traveler.id} className="traveler-card glass">
                                <div className="match-badge" title="AI Compatibility Score">
                                    {traveler.matchScore}% Match
                                </div>
                                <div className="card-header">
                                    <Link to={`/profile/${traveler.id}`} className="avatar-container" style={{ textDecoration: 'none' }}>
                                        <div className="avatar">
                                            {traveler.avatar && traveler.avatar.startsWith('/uploads') ? (
                                                <img src={`${API_URL}${traveler.avatar}`} alt={traveler.name} />
                                            ) : (
                                                <span>{traveler.avatar || '👤'}</span>
                                            )}
                                        </div>
                                        <div className={`status-indicator ${Math.random() > 0.5 ? 'online' : 'offline'}`} title="Online Status"></div>
                                    </Link>
                                    <div className="header-info">
                                        <Link to={`/profile/${traveler.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h3>{traveler.name}, {traveler.age}</h3>
                                        </Link>
                                        <p className="location">📍 {traveler.location}</p>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="destination-badge">
                                        <span>Planning to go to:</span>
                                        <strong>{traveler.destination}</strong>
                                    </div>
                                    <div className="interests-tags">
                                        {(traveler.interests || []).map((interest, index) => (
                                            <span key={index} className="tag">{interest}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button
                                        className="btn-primary connect-btn"
                                        onClick={() => handleConnect(traveler)}
                                    >
                                        Message
                                    </button>
                                    <div className="secondary-actions">
                                        <button className="icon-btn" onClick={() => handleAddFriend(traveler.id)} title="Add Friend">
                                            ➕
                                        </button>
                                        <button className="icon-btn" onClick={() => handleSaveProfile(traveler.id)} title="Save Profile">
                                            ❤️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <MapView trips={trips} />
            )}
        </div>
    );
};

export default FindTravelers;
