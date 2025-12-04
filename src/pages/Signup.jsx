import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import './Auth.css';

const Signup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'customer', phone: '',
        location: '', destination: '', age: '', bio: '',
        interests: '', adventures: '', likes: '', dislikes: '',
        religious_views: '', relationship_status: '', avatar: '👤'
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhoneChange = (value) => {
        setFormData({ ...formData, phone: value });
    };

    const handleArrayChange = (e) => {
        // Split by comma for array fields
        setFormData({ ...formData, [e.target.name]: e.target.value.split(',').map(item => item.trim()) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            navigate('/verify-email', { state: { email: formData.email } });
        } catch (err) {
            setError(err.message);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="auth-page container">
            <div className="auth-card glass wide">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Step {step} of 3</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div className="form-step">
                            <h3>Basic Info</h3>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <PhoneInput
                                    country={'us'}
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    inputStyle={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' }}
                                    buttonStyle={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                    dropdownStyle={{ background: '#242424', color: 'white' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input name="password" type="password" value={formData.password} onChange={handleChange} required />
                            </div>
                            <button type="button" onClick={nextStep} className="btn-primary auth-btn">Next</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="form-step">
                            <h3>Profile Details</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Age</label>
                                    <input name="age" type="number" value={formData.age} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Current Location</label>
                                    <input name="location" value={formData.location} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Dream Destination</label>
                                <input name="destination" value={formData.destination} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3"></textarea>
                            </div>
                            <div className="form-row">
                                <button type="button" onClick={prevStep} className="btn-secondary auth-btn">Back</button>
                                <button type="button" onClick={nextStep} className="btn-primary auth-btn">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="form-step">
                            <h3>Personal Preferences</h3>
                            <div className="form-group">
                                <label>Interests (comma separated)</label>
                                <input name="interests" placeholder="Hiking, Photography..." onChange={handleArrayChange} />
                            </div>
                            <div className="form-group">
                                <label>Likes (comma separated)</label>
                                <input name="likes" placeholder="Coffee, Dogs..." onChange={handleArrayChange} />
                            </div>
                            <div className="form-group">
                                <label>Dislikes (comma separated)</label>
                                <input name="dislikes" placeholder="Traffic, Rude people..." onChange={handleArrayChange} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Religious Views</label>
                                    <input name="religious_views" value={formData.religious_views} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Relationship Status</label>
                                    <select name="relationship_status" value={formData.relationship_status} onChange={handleChange}>
                                        <option value="">Select...</option>
                                        <option value="Single">Single</option>
                                        <option value="Taken">Taken</option>
                                        <option value="Complicated">It's Complicated</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <button type="button" onClick={prevStep} className="btn-secondary auth-btn">Back</button>
                                <button type="submit" className="btn-primary auth-btn">Create Account</button>
                            </div>
                        </div>
                    )}
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login" className="text-gradient">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
