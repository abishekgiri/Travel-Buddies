const jwt = require('jsonwebtoken');

const getTokenFromHeader = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return null;
    }

    return authorizationHeader.slice(7).trim();
};

const decodeToken = (token) => {
    if (!token) {
        throw new Error('Missing token');
    }

    if (!process.env.JWT_SECRET) {
        throw new Error('JWT secret is not configured');
    }

    return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyToken = (req, res, next) => {
    try {
        const token = getTokenFromHeader(req.headers.authorization);
        req.user = decodeToken(token);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or missing authentication token' });
    }
};

const optionalAuth = (req, res, next) => {
    try {
        const token = getTokenFromHeader(req.headers.authorization);
        req.user = token ? decodeToken(token) : null;
    } catch (error) {
        req.user = null;
    }

    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    next();
};

module.exports = {
    decodeToken,
    getTokenFromHeader,
    optionalAuth,
    requireRole,
    verifyToken
};
