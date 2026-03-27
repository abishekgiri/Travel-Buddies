import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';
import NotificationCenter from './NotificationCenter';
import './Navbar.css';

const Navbar = () => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);



    return (
        <nav className="navbar glass">
            <div className="container navbar-content">
                <Link to="/" className="logo">
                    <img src="/logo.png" alt="TravelBuddies" className="logo-image" />
                    <span>Travel<span className="logo-highlight">Buddies</span></span>
                </Link>

                <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                    <Link to="/find-travelers" onClick={() => setIsMenuOpen(false)}>Find Travelers</Link>
                    <Link to="/trips" onClick={() => setIsMenuOpen(false)}>Trips</Link>
                    <Link to="/transport" onClick={() => setIsMenuOpen(false)}>Transport</Link>
                    {user && <Link to="/chat" onClick={() => setIsMenuOpen(false)}>Chat</Link>}
                    {user && user.role === 'owner' && (
                        <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="nav-admin-link">
                            Admin
                        </Link>
                    )}
                </div>

                <div className="nav-auth">
                    {user ? (
                        <>
                            <NotificationCenter />
                            <div className="user-menu">
                                <Link to="/profile" className="user-profile">
                                    {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/')) ? (
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
                        <Link to="/login" className="btn-primary nav-login" onClick={() => setIsMenuOpen(false)}>
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
