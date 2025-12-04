import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && user.role !== 'owner' && user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [user, navigate]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ requester_id: user.id })
            });

            if (response.ok) {
                alert('User deleted successfully');
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;
    if (error) return <div className="container" style={{ paddingTop: '100px' }}>Error: {error}</div>;

    return (
        <div className="admin-dashboard container">
            <div className="dashboard-header glass">
                <h1>Admin Dashboard</h1>
                <p>Manage users and platform settings</p>
            </div>

            <div className="users-section glass">
                <h2>All Users ({users.length})</h2>
                <div className="table-responsive">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Location</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-small">
                                                {u.avatar && (u.avatar.startsWith('/') || u.avatar.startsWith('http')) ? (
                                                    <img
                                                        src={u.avatar.startsWith('/') ? `${API_URL}${u.avatar}` : u.avatar}
                                                        alt={u.name}
                                                    />
                                                ) : (
                                                    u.avatar || '👤'
                                                )}
                                            </div>
                                            <div className="user-info-small">
                                                <span className="user-name-small">{u.name}</span>
                                                <span className="user-email-small">{u.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                                    </td>
                                    <td>{u.location || 'N/A'}</td>
                                    <td>
                                        {u.id !== user.id && (
                                            <button
                                                className="btn-delete-sm"
                                                onClick={() => handleDeleteUser(u.id)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
