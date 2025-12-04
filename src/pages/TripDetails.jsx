import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WeatherWidget from '../components/WeatherWidget';
import ItineraryTimeline from '../components/ItineraryTimeline';
import ExpenseSplitter from '../components/ExpenseSplitter';
import ActivityMap from '../components/ActivityMap';
import BestActivities from '../components/BestActivities';
import PhotoGallery from '../components/PhotoGallery';
import TripChat from '../components/TripChat';
import { API_URL } from '../config';
import './TripDetails.css';

const TripDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('itinerary');
    const [newActivity, setNewActivity] = useState({
        activity: '',
        date: '',
        cost: '',
        notes: ''
    });
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showExpenseSplitter, setShowExpenseSplitter] = useState(false);
    const [budgetId, setBudgetId] = useState(null);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiInterests, setAiInterests] = useState('');
    const [generatingAI, setGeneratingAI] = useState(false);

    useEffect(() => {
        fetchTripDetails();
    }, [id]);

    const handleGenerateItinerary = async () => {
        setGeneratingAI(true);
        try {
            const response = await fetch(`${API_URL}/api/ai/generate-itinerary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId: id,
                    destination: trip.destination,
                    startDate: trip.start_date,
                    endDate: trip.end_date,
                    interests: aiInterests
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Itinerary generated successfully!');
                setShowAIModal(false);
                fetchTripDetails(); // Refresh to show new activities
            } else {
                throw new Error(data.error || 'Failed to generate itinerary');
            }
        } catch (error) {
            console.error('AI Error:', error);
            alert(`Failed to generate itinerary: ${error.message}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    const fetchTripDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${id}`);
            if (!response.ok) throw new Error('Failed to fetch trip');
            const data = await response.json();
            setTrip(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveTrip = async () => {
        if (!confirm('Are you sure you want to leave this trip?')) return;

        try {
            const response = await fetch(`${API_URL}/api/trips/${id}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });

            if (!response.ok) throw new Error('Failed to leave trip');

            alert('Successfully left trip');
            navigate('/trips');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/trips/${id}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newActivity)
            });

            if (!response.ok) throw new Error('Failed to add activity');

            setNewActivity({ activity: '', date: '', cost: '', notes: '' });
            setShowActivityForm(false);
            fetchTripDetails();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleOpenExpenseSplitter = async () => {
        try {
            // Check if budget exists
            const res = await fetch(`${API_URL}/api/budgets/${id}`);
            if (res.ok) {
                const data = await res.json();
                setBudgetId(data.budget.id);
                setShowExpenseSplitter(true);
            } else {
                // Create default budget if not exists
                const createRes = await fetch(`${API_URL}/api/budgets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trip_id: id,
                        total_budget: trip.budget || 1000,
                        currency: 'USD',
                        created_by: user.id
                    })
                });
                if (createRes.ok) {
                    const data = await createRes.json();
                    setBudgetId(data.id);
                    setShowExpenseSplitter(true);
                } else {
                    alert('Failed to initialize budget');
                }
            }
        } catch (err) {
            console.error(err);
            alert('Error accessing budget system');
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;
    if (!trip) return <div className="container" style={{ paddingTop: '100px' }}>Trip not found</div>;

    const isMember = trip.members?.some(m => m.user_id === user?.id);
    const isCreator = trip.creator_id === user?.id;

    return (
        <div className="trip-details-page container">
            <div className="trip-header glass" style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${trip.image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(trip.destination)}%20scenic%20travel%204k%20wallpaper?width=1200&height=400&nologo=true`})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
            }}>
                <div className="header-content">
                    <h1>{trip.title}</h1>
                    <p className="destination">📍 {trip.destination}</p>
                    <p className="dates">
                        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                    </p>
                    {trip.budget && <p className="budget">Budget: ${trip.budget}</p>}
                </div>
                <div className="header-actions">
                    {isMember && (
                        <>
                            <button
                                className="btn-primary"
                                onClick={() => navigate(`/trips/${id}/budget`)}
                                style={{ marginRight: '1rem' }}
                            >
                                💰 Budget
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={handleOpenExpenseSplitter}
                                style={{ marginRight: '1rem' }}
                            >
                                💸 Split Expense
                            </button>
                        </>
                    )}
                    {isMember && !isCreator && (
                        <button className="btn-secondary" onClick={handleLeaveTrip}>
                            Leave Trip
                        </button>
                    )}
                    {(isCreator || user.role === 'owner') && (
                        <button
                            className="btn-secondary"
                            style={{ marginLeft: '1rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={async () => {
                                if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
                                    try {
                                        const response = await fetch(`${API_URL}/api/trips/${id}`, {
                                            method: 'DELETE',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                                            },
                                            body: JSON.stringify({ user_id: user.id })
                                        });
                                        if (response.ok) {
                                            alert('Trip deleted successfully');
                                            navigate('/trips');
                                        } else {
                                            const data = await response.json();
                                            alert(data.error || 'Failed to delete trip');
                                        }
                                    } catch (err) {
                                        alert(err.message);
                                    }
                                }
                            }}
                        >
                            Delete Trip
                        </button>
                    )}
                </div>
            </div>

            {showExpenseSplitter && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <ExpenseSplitter
                            budgetId={budgetId}
                            tripId={id}
                            currency="USD"
                            onExpenseAdded={() => {
                                alert('Expense added!');
                                setShowExpenseSplitter(false);
                            }}
                            onCancel={() => setShowExpenseSplitter(false)}
                        />
                    </div>
                </div>
            )}

            <div className="trip-body">
                <div className="main-content">
                    <section className="section glass">
                        <h2>About This Trip</h2>
                        <p>{trip.description || 'No description provided.'}</p>
                    </section>

                    <div className="tabs">
                        <button
                            className={`tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
                            onClick={() => setActiveTab('itinerary')}
                        >
                            📅 Itinerary
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            📸 Photos
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            💬 Chat
                        </button>
                    </div>

                    <section className="section glass">
                        {activeTab === 'itinerary' && (
                            <>
                                <div className="section-header">
                                    <h2>Itinerary & Activities</h2>
                                    <div className="header-actions-group">
                                        {isMember && (
                                            <>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setShowAIModal(true)}
                                                    style={{ marginRight: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: 'white' }}
                                                >
                                                    ✨ AI Plan Trip
                                                </button>
                                                <button className="btn-primary" onClick={() => setShowActivityForm(!showActivityForm)}>
                                                    + Add Activity
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {showAIModal && (
                                    <div className="modal-overlay">
                                        <div className="modal-content glass">
                                            <h3>✨ AI Trip Planner</h3>
                                            <p>Let AI generate a schedule for your trip to {trip.destination}!</p>

                                            <div className="form-group">
                                                <label>What are your interests?</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Museums, Food, Hiking, Nightlife..."
                                                    value={aiInterests}
                                                    onChange={(e) => setAiInterests(e.target.value)}
                                                    className="modal-input"
                                                />
                                            </div>

                                            <div className="form-actions">
                                                <button className="btn-secondary" onClick={() => setShowAIModal(false)} disabled={generatingAI}>
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn-primary"
                                                    onClick={handleGenerateItinerary}
                                                    disabled={generatingAI}
                                                >
                                                    {generatingAI ? 'Generating...' : 'Generate Itinerary'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showActivityForm && (
                                    <form className="activity-form" onSubmit={handleAddActivity}>
                                        <input
                                            type="text"
                                            placeholder="Activity name"
                                            value={newActivity.activity}
                                            onChange={(e) => setNewActivity({ ...newActivity, activity: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="date"
                                            value={newActivity.date}
                                            onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Cost (optional)"
                                            value={newActivity.cost}
                                            onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Notes"
                                            value={newActivity.notes}
                                            onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                                        />
                                        <div className="form-actions">
                                            <button type="button" className="btn-secondary" onClick={() => setShowActivityForm(false)}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn-primary">
                                                Add
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <ItineraryTimeline
                                    activities={trip.activities || []}
                                    startDate={trip.start_date}
                                    endDate={trip.end_date}
                                />

                                <ActivityMap
                                    destination={trip.destination}
                                    activities={trip.activities || []}
                                />
                            </>
                        )}

                        {activeTab === 'photos' && <PhotoGallery tripId={id} />}

                        {activeTab === 'chat' && <TripChat tripId={id} />}
                    </section>
                </div>

                <aside className="sidebar">
                    <WeatherWidget destination={trip.destination} date={trip.start_date} />
                    <BestActivities destination={trip.destination} />

                    <section className="section glass">
                        <h3>Trip Members ({trip.members?.length || 0}/{trip.max_travelers})</h3>
                        <div className="members-list">
                            {trip.members?.map((member) => (
                                <div key={member.id} className="member-item">
                                    <div className="member-avatar">
                                        {member.avatar && (member.avatar.startsWith('/') || member.avatar.startsWith('http')) ? (
                                            <img
                                                src={member.avatar.startsWith('/') ? `${API_URL}${member.avatar}` : member.avatar}
                                                alt={member.name}
                                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            member.avatar || '👤'
                                        )}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.name}</span>
                                        {member.user_id === trip.creator_id && <span className="member-role">Creator</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default TripDetails;
