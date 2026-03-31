export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const hasWindow = typeof window !== 'undefined';

const decodeJwtPayload = (token) => {
    try {
        const payload = token?.split('.')?.[1];
        if (!payload) {
            return null;
        }

        const normalizedPayload = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');

        return JSON.parse(window.atob(normalizedPayload));
    } catch {
        return null;
    }
};

export const clearStoredAuth = () => {
    if (!hasWindow) {
        return;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const getTokenExpiryTime = (token) => {
    const payload = decodeJwtPayload(token);
    return payload?.exp ? payload.exp * 1000 : null;
};

export const getAuthToken = () => {
    if (!hasWindow) {
        return null;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        return null;
    }

    const expiryTime = getTokenExpiryTime(token);
    if (expiryTime && expiryTime <= Date.now()) {
        clearStoredAuth();
        return null;
    }

    return token;
};

export const getStoredAuthUser = () => {
    if (!hasWindow) {
        return null;
    }

    const token = getAuthToken();
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        if (!token && storedUser) {
            localStorage.removeItem('user');
        }
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        clearStoredAuth();
        return null;
    }
};

export const createAuthHeaders = (headers = {}) => {
    const token = getAuthToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export const createSocketOptions = () => ({
    auth: {
        token: getAuthToken()
    }
});
