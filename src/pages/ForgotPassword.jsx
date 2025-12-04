import React, { useState } from 'react';
import { API_URL } from '../config';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            setMessage('Reset code sent! Check your email.');
            setTimeout(() => navigate('/reset-password', { state: { email } }), 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-page container">
            <div className="auth-card glass">
                <h2>Forgot Password</h2>
                <p className="auth-subtitle">Enter your email to receive a reset code.</p>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message" style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary auth-btn">Send Code</button>
                    <div className="auth-footer">
                        <Link to="/login" className="text-gradient">Back to Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
