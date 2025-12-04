const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database.cjs');

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'server/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get photos for a trip or user
router.get('/:tripId', (req, res) => {
    const { tripId } = req.params;
    const { userId } = req.query;

    let sql = `SELECT p.*, u.name as user_name, u.avatar as user_avatar 
               FROM photos p 
               JOIN users u ON p.user_id = u.id`;
    let params = [];

    if (tripId === 'user' && userId) {
        sql += ` WHERE p.user_id = ? AND p.trip_id IS NULL`;
        params.push(userId);
    } else {
        sql += ` WHERE p.trip_id = ?`;
        params.push(tripId);
    }

    sql += ` ORDER BY p.uploaded_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch photos' });
        }
        res.json({ photos: rows });
    });
});

// Upload a photo
router.post('/:tripId', upload.single('photo'), (req, res) => {
    const { tripId } = req.params;
    const { userId, caption } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = `/uploads/${file.filename}`;
    const actualTripId = tripId === 'user' ? null : tripId;

    db.run(
        `INSERT INTO photos (trip_id, user_id, url, caption) VALUES (?, ?, ?, ?)`,
        [actualTripId, userId, url, caption],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to save photo' });
            }
            res.json({
                success: true,
                photo: {
                    id: this.lastID,
                    trip_id: actualTripId,
                    user_id: userId,
                    url,
                    caption,
                    uploaded_at: new Date().toISOString()
                }
            });
        }
    );
});

module.exports = router;
