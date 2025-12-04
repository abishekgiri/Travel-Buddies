import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RecommendedTrips.css';

const RecommendedTrips = ({ limit = 3 }) => {
    const { user } = useAuth();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchRecommendations();
        }
    }, [user]);

    const fetchRecommendations = async () => {
        try {
            const response = await fetch(
                `http://localhost:3000/api/recommendations/trips/${user.id}?limit=${limit}`
            );
            const data = await response.json();
            setTrips(data);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user || loading) return null;
    if (trips.length === 0) return null;

    return (
        <div className="recommended-trips">
            <div className="recommendations-header">
                <h2>🎯 Recommended For You</h2>
                <p>Trips that match your interests and preferences</p>
            </div>

            <div className="trips-grid">
                {trips.map(trip => (
                    <Link key={trip.id} to={`/trips/${trip.id}`} className="trip-card glass">
                        {trip.image_url && (
                            <div className="trip-image" style={{ backgroundImage: `url(${trip.image_url})` }}></div>
                        )}
                        <div className="trip-content">
                            <div className="trip-header-row">
                                <h3>{trip.title}</h3>
                                {trip.compatibility_score > 0 && (
                                    <div className="compatibility-score" title={`${trip.compatibility_score}% match`}>
                                        <span className="score-value">{trip.compatibility_score}</span>
                                        <span className="score-label">%</span>
                                    </div>
                                )}
                            </div>
                            <p className="trip-destination">📍 {trip.destination}</p>
                            <p className="trip-dates">
                                {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                            </p>
                            {trip.budget && <p className="trip-budget">💰 ${trip.budget}</p>}
                            <p className="trip-description">{trip.description?.substring(0, 80)}...</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default RecommendedTrips;
