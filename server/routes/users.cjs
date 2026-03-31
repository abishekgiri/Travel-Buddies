const express = require('express');
const db = require('../database.cjs');
const { optionalAuth, requireRole, verifyToken } = require('../middleware/auth.cjs');

const router = express.Router();

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
    });
});

const parseJsonArray = (value) => {
    if (!value) {
        return [];
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return [];
    }
};

const serializeArray = (value) => {
    if (value === undefined) {
        return null;
    }

    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    return value;
};

const isPrivilegedUser = (user) => user && (user.role === 'owner' || user.role === 'admin');

const mapUserRow = (row, includePrivateFields = false) => {
    if (!row) {
        return null;
    }

    const user = {
        id: row.id,
        name: row.name,
        role: row.role,
        location: row.location,
        destination: row.destination,
        age: row.age,
        bio: row.bio,
        interests: parseJsonArray(row.interests),
        adventures: parseJsonArray(row.adventures),
        likes: parseJsonArray(row.likes),
        dislikes: parseJsonArray(row.dislikes),
        religious_views: row.religious_views,
        relationship_status: row.relationship_status,
        avatar: row.avatar,
        cover_photo: row.cover_photo
    };

    if (includePrivateFields) {
        user.email = row.email;
        user.phone = row.phone;
    }

    return user;
};

// Get all users (for finding travelers)
router.get('/', optionalAuth, async (req, res) => {
    const includeEmail = isPrivilegedUser(req.user);
    const selectFields = [
        'id',
        'name',
        'location',
        'destination',
        'age',
        'interests',
        'avatar',
        'role'
    ];

    if (includeEmail) {
        selectFields.push('email');
    }

    try {
        const rows = await dbAll(`SELECT ${selectFields.join(', ')} FROM users`);
        const users = rows.map((user) => ({
            ...user,
            interests: parseJsonArray(user.interests)
        }));

        res.json({ data: users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single user profile
router.get('/:id', optionalAuth, async (req, res) => {
    const targetUserId = Number(req.params.id);
    const includePrivateFields = req.user && (req.user.id === targetUserId || isPrivilegedUser(req.user));
    const selectFields = [
        'id',
        'name',
        'role',
        'location',
        'destination',
        'age',
        'bio',
        'interests',
        'adventures',
        'likes',
        'dislikes',
        'religious_views',
        'relationship_status',
        'avatar',
        'cover_photo'
    ];

    if (includePrivateFields) {
        selectFields.push('email', 'phone');
    }

    try {
        const row = await dbGet(
            `SELECT ${selectFields.join(', ')} FROM users WHERE id = ?`,
            [targetUserId]
        );

        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ data: mapUserRow(row, includePrivateFields) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/:id', verifyToken, async (req, res) => {
    const targetUserId = Number(req.params.id);
    const canEdit = req.user.id === targetUserId || isPrivilegedUser(req.user);

    if (!canEdit) {
        return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const {
        name, email, location, destination, age, bio,
        interests, adventures, likes, dislikes, religious_views,
        relationship_status, avatar, phone, cover_photo
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

    try {
        const result = await dbRun(sql, [
            name ?? null,
            email ?? null,
            location ?? null,
            destination ?? null,
            age ?? null,
            bio ?? null,
            serializeArray(interests),
            serializeArray(adventures),
            serializeArray(likes),
            serializeArray(dislikes),
            religious_views ?? null,
            relationship_status ?? null,
            avatar ?? null,
            cover_photo ?? null,
            phone ?? null,
            targetUserId
        ]);

        const updatedRow = await dbGet(
            `SELECT id, name, role, email, location, destination, age, bio, interests, adventures,
                    likes, dislikes, religious_views, relationship_status, avatar, phone, cover_photo
             FROM users
             WHERE id = ?`,
            [targetUserId]
        );

        res.json({
            message: 'User updated successfully',
            changes: result.changes,
            user: mapUserRow(updatedRow, true)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user (Owner only)
router.delete('/:id', verifyToken, requireRole('owner'), async (req, res) => {
    const targetUserId = Number(req.params.id);

    if (req.user.id === targetUserId) {
        return res.status(400).json({ error: 'Cannot delete your own owner account' });
    }

    try {
        const existingUser = await dbGet('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const createdTrips = await dbAll('SELECT id FROM trips WHERE creator_id = ?', [targetUserId]);
        const createdTripIds = createdTrips.map((trip) => trip.id);

        if (createdTripIds.length > 0) {
            const tripPlaceholders = createdTripIds.map(() => '?').join(',');
            const budgets = await dbAll(
                `SELECT id FROM budgets WHERE trip_id IN (${tripPlaceholders})`,
                createdTripIds
            );
            const budgetIds = budgets.map((budget) => budget.id);

            if (budgetIds.length > 0) {
                const budgetPlaceholders = budgetIds.map(() => '?').join(',');
                await dbRun(`DELETE FROM expenses WHERE budget_id IN (${budgetPlaceholders})`, budgetIds);
            }

            await dbRun(`DELETE FROM budgets WHERE trip_id IN (${tripPlaceholders})`, createdTripIds);
            await dbRun(`DELETE FROM trip_messages WHERE trip_id IN (${tripPlaceholders})`, createdTripIds);
            await dbRun(`DELETE FROM photos WHERE trip_id IN (${tripPlaceholders})`, createdTripIds);
            await dbRun(`DELETE FROM trip_activities WHERE trip_id IN (${tripPlaceholders})`, createdTripIds);
            await dbRun(`DELETE FROM trip_members WHERE trip_id IN (${tripPlaceholders})`, createdTripIds);
            await dbRun(`DELETE FROM trips WHERE id IN (${tripPlaceholders})`, createdTripIds);
        }

        const conversations = await dbAll(
            'SELECT id FROM conversations WHERE user1_id = ? OR user2_id = ?',
            [targetUserId, targetUserId]
        );
        const conversationIds = conversations.map((conversation) => conversation.id);

        if (conversationIds.length > 0) {
            const conversationPlaceholders = conversationIds.map(() => '?').join(',');
            await dbRun(
                `DELETE FROM messages WHERE conversation_id IN (${conversationPlaceholders})`,
                conversationIds
            );
            await dbRun(
                `DELETE FROM conversations WHERE id IN (${conversationPlaceholders})`,
                conversationIds
            );
        }

        await dbRun('DELETE FROM trip_members WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM journey_members WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM notifications WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM photos WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM trip_messages WHERE sender_id = ?', [targetUserId]);
        await dbRun('DELETE FROM expenses WHERE paid_by = ?', [targetUserId]);
        await dbRun('DELETE FROM users WHERE id = ?', [targetUserId]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
