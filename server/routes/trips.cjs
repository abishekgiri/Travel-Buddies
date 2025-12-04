const express = require('express');
const db = require('../database.cjs');

const router = express.Router();

// Get all trips
router.get('/', (req, res) => {
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

    db.all(query, params, (err, trips) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, data: trips });
    });
});

// Get single trip details
router.get('/:id', (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT t.*, u.name as creator_name, u.avatar as creator_avatar, u.email as creator_email
     FROM trips t
     JOIN users u ON t.creator_id = u.id
     WHERE t.id = ?`,
        [id],
        (err, trip) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!trip) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            // Get trip members
            db.all(
                `SELECT tm.*, u.name, u.avatar, u.location
         FROM trip_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.trip_id = ?`,
                [id],
                (err, members) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Get trip activities
                    db.all(
                        'SELECT * FROM trip_activities WHERE trip_id = ? ORDER BY date',
                        [id],
                        (err, activities) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }

                            res.json({
                                success: true,
                                data: {
                                    ...trip,
                                    members,
                                    activities
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});

// Get trip members
router.get('/:id/members', (req, res) => {
    const { id } = req.params;
    db.all(
        `SELECT u.id, u.name, u.avatar, u.email 
         FROM trip_members tm 
         JOIN users u ON tm.user_id = u.id 
         WHERE tm.trip_id = ?`,
        [id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Create new trip (Admin/Owner)
router.post('/admin/create', (req, res) => {
    const {
        creator_id,
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

    if (!creator_id || !title || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is owner/admin
    db.get('SELECT role FROM users WHERE id = ?', [creator_id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized: Only admins can create curated trips' });
        }

        db.run(
            `INSERT INTO trips (creator_id, title, destination, start_date, end_date, budget, max_travelers, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [creator_id, title, destination, start_date, end_date, budget, max_travelers || 10, description, image_url],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const tripId = this.lastID;

                // Automatically add creator as first member
                db.run('INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)', [tripId, creator_id]);

                // Add activities if provided
                if (activities && activities.length > 0) {
                    const stmt = db.prepare('INSERT INTO trip_activities (trip_id, activity) VALUES (?, ?)');
                    activities.forEach(activity => {
                        stmt.run(tripId, activity);
                    });
                    stmt.finalize();
                }

                res.status(201).json({
                    success: true,
                    data: { id: tripId, message: 'Curated trip created successfully' }
                });
            }
        );
    });
});

// Create new trip (Standard)
router.post('/', (req, res) => {
    const {
        creator_id,
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

    if (!creator_id || !title || !destination || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        `INSERT INTO trips (creator_id, title, destination, start_date, end_date, budget, max_travelers, description, image_url, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [creator_id, title, destination, start_date, end_date, budget, max_travelers || 10, description, image_url, latitude, longitude],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Automatically add creator as first member
            db.run(
                'INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)',
                [this.lastID, creator_id],
                (err) => {
                    if (err) {
                        console.error('Error adding creator as member:', err);
                    }
                }
            );

            res.status(201).json({
                success: true,
                data: { id: this.lastID, message: 'Trip created successfully' }
            });
        }
    );
});

// Join a trip
router.post('/:id/join', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID required' });
    }

    // Check if trip exists and is open
    db.get('SELECT * FROM trips WHERE id = ?', [id], (err, trip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip.status !== 'open') {
            return res.status(400).json({ error: 'Trip is not open for joining' });
        }

        // Check current member count
        db.get(
            'SELECT COUNT(*) as count FROM trip_members WHERE trip_id = ?',
            [id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (result.count >= trip.max_travelers) {
                    return res.status(400).json({ error: 'Trip is full' });
                }

                // Add user to trip
                db.run(
                    'INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)',
                    [id, user_id],
                    function (err) {
                        if (err) {
                            if (err.message.includes('UNIQUE')) {
                                return res.status(400).json({ error: 'Already a member of this trip' });
                            }
                            return res.status(500).json({ error: err.message });
                        }

                        res.json({ success: true, message: 'Successfully joined trip' });
                    }
                );
            }
        );
    });
});

// Leave a trip
router.post('/:id/leave', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID required' });
    }

    db.run(
        'DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?',
        [id, user_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Not a member of this trip' });
            }

            res.json({ success: true, message: 'Successfully left trip' });
        }
    );
});

// Add activity to trip
router.post('/:id/activities', (req, res) => {
    const { id } = req.params;
    const { activity, date, cost, notes } = req.body;

    if (!activity) {
        return res.status(400).json({ error: 'Activity name required' });
    }

    db.run(
        'INSERT INTO trip_activities (trip_id, activity, date, cost, notes) VALUES (?, ?, ?, ?, ?)',
        [id, activity, date, cost, notes],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                success: true,
                data: { id: this.lastID, message: 'Activity added successfully' }
            });
        }
    );
});

// Get user's trips
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;

    db.all(
        `SELECT DISTINCT t.*, u.name as creator_name, u.avatar as creator_avatar,
            (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id) as member_count
     FROM trips t
     JOIN users u ON t.creator_id = u.id
     JOIN trip_members tm ON t.id = tm.trip_id
     WHERE tm.user_id = ?
     ORDER BY t.start_date DESC`,
        [userId],
        (err, trips) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: trips });
        }
    );
});

// Delete a trip (Admin/Owner or Creator)
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body; // In a real app, get this from auth middleware

    if (!user_id) {
        return res.status(400).json({ error: 'User ID required' });
    }

    // Check permissions
    db.get('SELECT role FROM users WHERE id = ?', [user_id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT creator_id FROM trips WHERE id = ?', [id], (err, trip) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!trip) return res.status(404).json({ error: 'Trip not found' });

            const isOwner = user && (user.role === 'owner' || user.role === 'admin');
            const isCreator = trip.creator_id === parseInt(user_id);

            if (!isOwner && !isCreator) {
                return res.status(403).json({ error: 'Unauthorized to delete this trip' });
            }

            // Perform deletion (Cascade manually if needed, but for now just the trip)
            // Ideally, we should delete from trip_members, trip_activities, etc.
            db.serialize(() => {
                db.run('DELETE FROM trip_members WHERE trip_id = ?', [id]);
                db.run('DELETE FROM trip_activities WHERE trip_id = ?', [id]);
                db.run('DELETE FROM photos WHERE trip_id = ?', [id]);
                db.run('DELETE FROM budgets WHERE trip_id = ?', [id]);
                db.run('DELETE FROM trips WHERE id = ?', [id], function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ success: true, message: 'Trip deleted successfully' });
                });
            });
        });
    });
});

// Get trip messages
router.get('/:id/messages', (req, res) => {
    const { id } = req.params;
    db.all(
        `SELECT tm.*, u.name as sender_name, u.avatar as sender_avatar
         FROM trip_messages tm
         JOIN users u ON tm.sender_id = u.id
         WHERE tm.trip_id = ?
         ORDER BY tm.created_at ASC`,
        [id],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: messages });
        }
    );
});

// Send trip message
router.post('/:id/messages', (req, res) => {
    const { id } = req.params;
    const { sender_id, message } = req.body;

    if (!sender_id || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'INSERT INTO trip_messages (trip_id, sender_id, message) VALUES (?, ?, ?)',
        [id, sender_id, message],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Fetch the created message to return it
            db.get(
                `SELECT tm.*, u.name as sender_name, u.avatar as sender_avatar
                 FROM trip_messages tm
                 JOIN users u ON tm.sender_id = u.id
                 WHERE tm.id = ?`,
                [this.lastID],
                (err, newMessage) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.status(201).json({ success: true, data: newMessage });
                }
            );
        }
    );
});

// Toggle pin message
router.put('/:id/messages/:messageId/pin', (req, res) => {
    const { messageId } = req.params;
    const { is_pinned } = req.body;

    db.run(
        'UPDATE trip_messages SET is_pinned = ? WHERE id = ?',
        [is_pinned ? 1 : 0, messageId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Message pin status updated' });
        }
    );
});

module.exports = router;
