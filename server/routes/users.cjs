const express = require('express');
const db = require('../database.cjs');

const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }
};

// Get all users (for finding travelers)
router.get('/', (req, res) => {
    const sql = 'SELECT id, name, location, destination, age, interests, avatar, role FROM users';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Parse JSON fields
        const users = rows.map(user => ({
            ...user,
            interests: JSON.parse(user.interests || '[]')
        }));
        res.json({ data: users });
    });
});

// Get single user profile
router.get('/:id', (req, res) => {
    const sql = 'SELECT id, name, email, role, location, destination, age, bio, interests, adventures, likes, dislikes, religious_views, relationship_status, avatar, cover_photo, phone FROM users WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse JSON fields
        const user = {
            ...row,
            interests: JSON.parse(row.interests || '[]'),
            adventures: JSON.parse(row.adventures || '[]'),
            likes: JSON.parse(row.likes || '[]'),
            dislikes: JSON.parse(row.dislikes || '[]')
        };

        res.json({ data: user });
    });
});

// Update user profile
router.put('/:id', verifyToken, (req, res) => {
    // In a real app, verify that req.user.id matches req.params.id or is admin
    // For now, we'll just allow updates

    const {
        name, email, location, destination, age, bio,
        interests, adventures, likes, dislikes, religious_views, relationship_status, avatar, phone
    } = req.body;

    const sql = `UPDATE users SET 
    name = COALESCE(?, name),
    email = COALESCE(?, email),
    location = COALESCE(?, location),
    destination = COALESCE(?, destination),
    age = COALESCE(?, age),
    bio = COALESCE(?, bio),
    interests = COALESCE(?, interests),
    adventures = COALESCE(?, adventures),
    likes = COALESCE(?, likes),
    dislikes = COALESCE(?, dislikes),
    religious_views = COALESCE(?, religious_views),
    relationship_status = COALESCE(?, relationship_status),
    avatar = COALESCE(?, avatar),
    cover_photo = COALESCE(?, cover_photo),
    phone = COALESCE(?, phone)
    WHERE id = ?`;

    const params = [
        name, email, location, destination, age, bio,
        JSON.stringify(interests), JSON.stringify(adventures), JSON.stringify(likes),
        JSON.stringify(dislikes), religious_views, relationship_status, avatar,
        req.body.cover_photo, phone,
        req.params.id
    ];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'User updated successfully', changes: this.changes });
    });
});

// Delete user (Owner only)
router.delete('/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { requester_id } = req.body;

    if (!requester_id) {
        return res.status(400).json({ error: 'Requester ID required' });
    }

    // Verify requester is owner
    db.get('SELECT role FROM users WHERE id = ?', [requester_id], (err, requester) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!requester || requester.role !== 'owner') {
            return res.status(403).json({ error: 'Unauthorized: Only owners can delete users' });
        }

        // Prevent deleting self (optional, but good practice)
        if (parseInt(id) === parseInt(requester_id)) {
            return res.status(400).json({ error: 'Cannot delete your own owner account' });
        }

        // Delete user and related data
        db.serialize(() => {
            db.run('DELETE FROM trip_members WHERE user_id = ?', [id]);
            db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [id, id]);
            db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'User deleted successfully' });
            });
        });
    });
});

module.exports = router;
