export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getAuthToken = () => localStorage.getItem('token');

export const createAuthHeaders = (headers = {}) => {
    const token = getAuthToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export const createSocketOptions = () => ({
    auth: {
        token: getAuthToken()
    }
});
