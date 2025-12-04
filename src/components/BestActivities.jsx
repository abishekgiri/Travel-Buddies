import React, { useState, useEffect } from 'react';
import './BestActivities.css';

const BestActivities = ({ destination }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!destination) return;

            setLoading(true);
            try {
                const response = await fetch('http://localhost:3000/api/ai/recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination })
                });

                const data = await response.json();
                if (data.success) {
                    setActivities(data.recommendations);
                } else {
                    throw new Error(data.error || 'Failed to get recommendations');
                }
            } catch (err) {
                console.error('Error fetching best activities:', err);
                setError('Could not load recommendations.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [destination]);

    if (loading) return <div className="best-activities glass loading">Finding best spots...</div>;
    if (error) return null; // Hide if error to avoid clutter
    if (activities.length === 0) return null;

    return (
        <div className="best-activities glass">
            <h3>🌟 Top Things to Do in {destination.split(',')[0]}</h3>
            <ul className="activity-list">
                {activities.map((activity, index) => (
                    <li key={index} className="activity-item">
                        <span className="activity-icon">📍</span>
                        <span className="activity-text">{activity}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BestActivities;
