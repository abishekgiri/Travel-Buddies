import React, { useState } from 'react';
import { AuthContext } from './auth-context';

const getStoredUser = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => getStoredUser());

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading: false }}>
            {children}
        </AuthContext.Provider>
    );
};
