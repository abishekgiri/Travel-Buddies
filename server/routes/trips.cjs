const express = require('express');
const db = require('../database.cjs');
const { requireRole, verifyToken } = require('../middleware/auth.cjs');

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

const isPrivilegedUser = (user) => user && (user.role === 'owner' || user.role === 'admin');

const getTrip = async (tripId) => dbGet('SELECT * FROM trips WHERE id = ?', [tripId]);

const isTripMember = async (tripId, userId) => {
    const membership = await dbGet(
        'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
        [tripId, userId]
    );

    return Boolean(membership);
};

const canAccessTrip = async (tripId, user) => {
    if (!user) {
        return false;
    }

    if (isPrivilegedUser(user)) {
        return true;
    }

    return isTripMember(tripId, user.id);
};

// Get all trips
router.get('/', async (req, res) => {
    const { status = 'open', destination, minBudget, maxBudget } = req.query;

    let query = `
        SELECT t.*, u.name as creator_name, u.avatar as creator_avatar,
               (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id) as member_count
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND t.status = ?';
        params.push(status);
    }

    if (destination) {
        query += ' AND t.destination LIKE ?';
        params.push(`%${destination}%`);
    }

    if (minBudget) {
        query += ' AND t.budget >= ?';
        params.push(minBudget);
    }

    if (maxBudget) {
        query += ' AND t.budget <= ?';
        params.push(maxBudget);
    }

    query += ' ORDER BY t.created_at DESC';

    try {
        const trips = await dbAll(query, params);
        res.json({ success: true, data: trips });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single trip details
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await dbGet(
            `SELECT t.*, u.name as creator_name, u.avatar as creator_avatar, u.email as creator_email
             FROM trips t
             JOIN users u ON t.creator_id = u.id
             WHERE t.id = ?`,
            [id]
        );

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        const members = await dbAll(
            `SELECT tm.*, u.name, u.avatar, u.location
             FROM trip_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.trip_id = ?`,
            [id]
        );

        const activities = await dbAll(
            'SELECT * FROM trip_activities WHERE trip_id = ? ORDER BY date',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...trip,
                members,
                activities
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get trip members
router.get('/:id/members', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (!(await canAccessTrip(id, req.user))) {
            return res.status(403).json({ error: 'You must be part of this trip to view members' });
        }

        const rows = await dbAll(
            `SELECT u.id, u.name, u.avatar, u.email 
             FROM trip_members tm 
             JOIN users u ON tm.user_id = u.id 
             WHERE tm.trip_id = ?`,
            [id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new trip (Admin/Owner)
router.post('/admin/create', verifyToken, requireRole('owner', 'admin'), async (req, res) => {
    const {
        title,
        destination,
        start_date,
        end_date,
        budget,
        max_travelers,
        description,
        image_url,
        activities
    } = req.body;

    if (!title || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await dbRun(
            `INSERT INTO trips (creator_id, title, destination, start_date, end_date, budget, max_travelers, description, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, destination, start_date, end_date, budget, max_travelers || 10, description, image_url]
        );

        const tripId = result.lastID;
        await dbRun('INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)', [tripId, req.user.id]);

        if (Array.isArray(activities) && activities.length > 0) {
            for (const activity of activities) {
                await dbRun('INSERT INTO trip_activities (trip_id, activity) VALUES (?, ?)', [tripId, activity]);
            }
        }

        res.status(201).json({
            success: true,
            data: { id: tripId, message: 'Curated trip created successfully' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new trip (Standard)
router.post('/', verifyToken, async (req, res) => {
    const {
        title,
        destination,
        start_date,
        end_date,
        budget,
        max_travelers,
        description,
        image_url,
        latitude,
        longitude
    } = req.body;

    if (!title || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await dbRun(
            `INSERT INTO trips (creator_id, title, destination, start_date, end_date, budget, max_travelers, description, image_url, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, destination, start_date, end_date, budget, max_travelers || 10, description, image_url, latitude, longitude]
        );

        await dbRun('INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)', [result.lastID, req.user.id]);

        res.status(201).json({
            success: true,
            data: { id: result.lastID, message: 'Trip created successfully' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Join a trip
router.post('/:id/join', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (trip.status !== 'open') {
            return res.status(400).json({ error: 'Trip is not open for joining' });
        }

        const result = await dbGet(
            'SELECT COUNT(*) as count FROM trip_members WHERE trip_id = ?',
            [id]
        );

        if (result.count >= trip.max_travelers) {
            return res.status(400).json({ error: 'Trip is full' });
        }

        await dbRun('INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)', [id, req.user.id]);
        res.json({ success: true, message: 'Successfully joined trip' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Already a member of this trip' });
        }

        res.status(500).json({ error: error.message });
    }
});

// Leave a trip
router.post('/:id/leave', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await dbRun(
            'DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Not a member of this trip' });
        }

        res.json({ success: true, message: 'Successfully left trip' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add activity to trip
router.post('/:id/activities', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { activity, date, cost, notes } = req.body;

    if (!activity) {
        return res.status(400).json({ error: 'Activity name required' });
    }

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (!(await canAccessTrip(id, req.user))) {
            return res.status(403).json({ error: 'You must be part of this trip to add activities' });
        }

        const result = await dbRun(
            'INSERT INTO trip_activities (trip_id, activity, date, cost, notes) VALUES (?, ?, ?, ?, ?)',
            [id, activity, date, cost, notes]
        );

        res.status(201).json({
            success: true,
            data: { id: result.lastID, message: 'Activity added successfully' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's trips
router.get('/user/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const requestedUserId = Number(userId);

    if (req.user.id !== requestedUserId && !isPrivilegedUser(req.user)) {
        return res.status(403).json({ error: 'You can only view your own trips' });
    }

    try {
        const trips = await dbAll(
            `SELECT DISTINCT t.*, u.name as creator_name, u.avatar as creator_avatar,
                (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id) as member_count
             FROM trips t
             JOIN users u ON t.creator_id = u.id
             JOIN trip_members tm ON t.id = tm.trip_id
             WHERE tm.user_id = ?
             ORDER BY t.start_date DESC`,
            [requestedUserId]
        );

        res.json({ success: true, data: trips });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a trip (Admin/Owner or Creator)
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await dbGet('SELECT creator_id FROM trips WHERE id = ?', [id]);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        const isCreator = trip.creator_id === req.user.id;
        if (!isCreator && !isPrivilegedUser(req.user)) {
            return res.status(403).json({ error: 'Unauthorized to delete this trip' });
        }

        const budgets = await dbAll('SELECT id FROM budgets WHERE trip_id = ?', [id]);
        const budgetIds = budgets.map((budget) => budget.id);

        if (budgetIds.length > 0) {
            const placeholders = budgetIds.map(() => '?').join(',');
            await dbRun(`DELETE FROM expenses WHERE budget_id IN (${placeholders})`, budgetIds);
        }

        await dbRun('DELETE FROM budgets WHERE trip_id = ?', [id]);
        await dbRun('DELETE FROM trip_messages WHERE trip_id = ?', [id]);
        await dbRun('DELETE FROM photos WHERE trip_id = ?', [id]);
        await dbRun('DELETE FROM trip_activities WHERE trip_id = ?', [id]);
        await dbRun('DELETE FROM trip_members WHERE trip_id = ?', [id]);
        await dbRun('DELETE FROM trips WHERE id = ?', [id]);

        res.json({ success: true, message: 'Trip deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get trip messages
router.get('/:id/messages', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (!(await canAccessTrip(id, req.user))) {
            return res.status(403).json({ error: 'You must be part of this trip to view messages' });
        }

        const messages = await dbAll(
            `SELECT tm.*, u.name as sender_name, u.avatar as sender_avatar
             FROM trip_messages tm
             JOIN users u ON tm.sender_id = u.id
             WHERE tm.trip_id = ?
             ORDER BY tm.created_at ASC`,
            [id]
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send trip message
router.post('/:id/messages', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (!(await canAccessTrip(id, req.user))) {
            return res.status(403).json({ error: 'You must be part of this trip to send messages' });
        }

        const result = await dbRun(
            'INSERT INTO trip_messages (trip_id, sender_id, message) VALUES (?, ?, ?)',
            [id, req.user.id, message]
        );

        const newMessage = await dbGet(
            `SELECT tm.*, u.name as sender_name, u.avatar as sender_avatar
             FROM trip_messages tm
             JOIN users u ON tm.sender_id = u.id
             WHERE tm.id = ?`,
            [result.lastID]
        );

        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle pin message
router.put('/:id/messages/:messageId/pin', verifyToken, async (req, res) => {
    const { id, messageId } = req.params;
    const { is_pinned } = req.body;

    try {
        const trip = await getTrip(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (!(await canAccessTrip(id, req.user))) {
            return res.status(403).json({ error: 'You must be part of this trip to pin messages' });
        }

        await dbRun(
            'UPDATE trip_messages SET is_pinned = ? WHERE id = ? AND trip_id = ?',
            [is_pinned ? 1 : 0, messageId, id]
        );

        res.json({ success: true, message: 'Message pin status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
