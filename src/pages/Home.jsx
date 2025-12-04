import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useMobile from '../hooks/useMobile';
import RecommendedTrips from '../components/RecommendedTrips';
import './Home.css';

const Home = () => {
    const heroRef = useRef(null);
    const { user } = useAuth();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!heroRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX / innerWidth - 0.5) * 20;
            const y = (clientY / innerHeight - 0.5) * 20;

            heroRef.current.style.transform = `translate(${x}px, ${y}px)`;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const isMobile = useMobile();

    if (isMobile) {
        return (
            <div className="home-page mobile-view" style={{ padding: '20px', paddingTop: '80px' }}>
                <div className="mobile-header" style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Travel<br /><span className="text-gradient">Buddies</span></h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Your pocket travel companion.</p>
                </div>

                <div className="mobile-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {user ? (
                        <>
                            <div className="glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    ✈️
                                </div>
                                <div>
                                    <h3 style={{ margin: 0 }}>Plan a Trip</h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Start a new adventure</p>
                                </div>
                            </div>
                            <Link to="/find-travelers" className="btn-primary" style={{ textAlign: 'center', padding: '15px' }}>
                                Find Travelers
                            </Link>
                            <Link to="/profile" className="btn-secondary" style={{ textAlign: 'center', padding: '15px', border: '1px solid var(--glass-border)' }}>
                                My Profile
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/signup" className="btn-primary" style={{ textAlign: 'center', padding: '15px' }}>
                                Get Started
                            </Link>
                            <Link to="/login" className="btn-secondary" style={{ textAlign: 'center', padding: '15px', border: '1px solid var(--glass-border)' }}>
                                Login
                            </Link>
                        </>
                    )}
                </div>

                <div className="mobile-features" style={{ marginTop: '40px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <Link to="/transport" className="glass" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '2rem' }}>🚆</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Transport</span>
                        </Link>
                        <Link to="/trips" className="glass" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '2rem' }}>🌍</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Trips</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="animated-bg">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                </div>

                <div className="container hero-container">
                    <div className="hero-content" ref={heroRef}>
                        <div className="badge">
                            ✨ {user ? `Welcome back, ${user.name}!` : 'Your Adventure Starts Here'}
                        </div>
                        <h1 className="hero-title">
                            {user ? 'Ready to Explore?' : 'Discover the World'}
                            <br />
                            <span className="text-gradient-animated">
                                {user ? 'Find Your Next Adventure' : 'With Travel Buddies'}
                            </span>
                        </h1>
                        <p className="hero-subtitle">
                            {user
                                ? 'Connect with fellow travelers and plan your next unforgettable journey together.'
                                : 'Connect with passionate travelers, share unforgettable experiences, and create memories that last a lifetime. Your perfect travel companion is just a click away.'
                            }
                        </p>
                        <div className="hero-actions">
                            {user ? (
                                <>
                                    <Link to="/find-travelers" className="btn-primary-large">
                                        <span>Find Travel Buddies</span>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </Link>
                                    <Link to="/profile" className="btn-secondary-large">
                                        <span>View Profile</span>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/signup" className="btn-primary-large">
                                        <span>Start Your Journey</span>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </Link>
                                    <Link to="/find-travelers" className="btn-secondary-large">
                                        <span>Explore Travelers</span>
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="stats-row">
                            <div className="stat-card glass">
                                <div className="stat-number">10K+</div>
                                <div className="stat-label">Active Travelers</div>
                            </div>
                            <div className="stat-card glass">
                                <div className="stat-number">150+</div>
                                <div className="stat-label">Countries</div>
                            </div>
                            <div className="stat-card glass">
                                <div className="stat-number">50K+</div>
                                <div className="stat-label">Trips Planned</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features-section">
                <div className="container">
                    <h2 className="section-title">Why Choose <span className="text-gradient">Travel Buddies</span></h2>
                    <div className="features-grid">
                        <div className="feature-card glass">
                            <div className="feature-icon">🌍</div>
                            <h3>Global Network</h3>
                            <p>Connect with travelers from every corner of the world</p>
                        </div>
                        <div className="feature-card glass">
                            <div className="feature-icon">🔒</div>
                            <h3>Safe & Secure</h3>
                            <p>Verified profiles and secure messaging for peace of mind</p>
                        </div>
                        <div className="feature-card glass">
                            <div className="feature-icon">💬</div>
                            <h3>Real-Time Chat</h3>
                            <p>Instant messaging to plan your perfect adventure</p>
                        </div>
                        <div className="feature-card glass">
                            <div className="feature-icon">✈️</div>
                            <h3>Trip Planning</h3>
                            <p>Collaborative tools to organize unforgettable journeys</p>
                        </div>
                    </div>
                </div>
            </section>

            {user && <RecommendedTrips limit={6} />}

            <section className="transport-promo-section">
                <div className="container">
                    <div className="promo-card glass">
                        <div className="promo-content">
                            <h2>✈️ Find Your Travel Buddy on Any Flight!</h2>
                            <p>Search for your flight, train, or bus and connect with others on the same journey.</p>
                            <Link to="/transport" className="btn-primary-large">
                                <span>Search Transport</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {!user && (
                <section className="cta-section">
                    <div className="container">
                        <div className="cta-card glass">
                            <h2>Ready to Start Your Adventure?</h2>
                            <p>Join thousands of travelers exploring the world together</p>
                            <Link to="/signup" className="btn-primary-large">
                                <span>Create Free Account</span>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
