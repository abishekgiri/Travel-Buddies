import React, { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import {
    getAuthToken,
    getStoredAuthUser,
    getTokenExpiryTime
} from '../config';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => getStoredAuthUser());

    const login = useCallback((userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const updateUser = useCallback((userData) => {
        setUser((currentUser) => {
            if (!currentUser) {
                return currentUser;
            }

            const nextUser = { ...currentUser, ...userData };
            localStorage.setItem('user', JSON.stringify(nextUser));
            return nextUser;
        });
    }, []);

    useEffect(() => {
        const token = getAuthToken();

        if (!token) {
            return undefined;
        }

        const expiryTime = getTokenExpiryTime(token);
        if (!expiryTime) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            logout();
        }, Math.max(expiryTime - Date.now(), 0));

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [logout, user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading: false }}>
            {children}
        </AuthContext.Provider>
    );
};
