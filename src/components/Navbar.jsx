import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import NotificationCenter from './NotificationCenter';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);



    return (
        <nav className="navbar glass">
            <div className="container navbar-content">
                <Link to="/" className="logo">
                    <img src="/logo.png" alt="TravelBuddies" style={{ height: '40px', marginRight: '10px' }} />
                    <span>Travel<span className="logo-highlight">Buddies</span></span>
                </Link>

                <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                    <Link to="/find-travelers" onClick={() => setIsMenuOpen(false)}>Find Travelers</Link>
                    <Link to="/trips" onClick={() => setIsMenuOpen(false)}>Trips</Link>
                    <Link to="/transport" onClick={() => setIsMenuOpen(false)}>Transport</Link>
                    {user && <Link to="/chat" onClick={() => setIsMenuOpen(false)}>Chat</Link>}
                    {user && user.role === 'owner' && <Link to="/admin" onClick={() => setIsMenuOpen(false)} style={{ color: '#ffd700' }}>Admin</Link>}
                </div>

                <div className="nav-auth">
                    {user ? (
                        <>
                            <NotificationCenter />
                            <div className="user-menu">
                                <Link to="/profile" className="user-profile">
                                    {user.avatar && user.avatar.startsWith('http') || user.avatar && user.avatar.startsWith('/') ? (
                                        <img
                                            src={user.avatar.startsWith('/') ? `${API_URL}${user.avatar}` : user.avatar}
                                            alt={user.name}
                                            className="user-avatar-img"
                                        />
                                    ) : (
                                        <span className="user-avatar-placeholder">{user.avatar || '👤'}</span>
                                    )}
                                    <span className="user-name">{user.name}</span>
                                </Link>

                            </div>
                        </>
                    ) : (
                        <Link to="/login" className="btn-primary" onClick={() => setIsMenuOpen(false)} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            Login
                        </Link>
                    )}
                </div>

                <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
