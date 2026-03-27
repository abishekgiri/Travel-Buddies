const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'server/uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
const isPrivilegedUser = (user) => user && (user.role === 'owner' || user.role === 'admin');

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
router.post('/:tripId', verifyToken, upload.single('photo'), (req, res) => {
    const { tripId } = req.params;
    const userId = Number(req.body.userId);
    const { caption } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (req.user.id !== userId && !isPrivilegedUser(req.user)) {
        return res.status(403).json({ error: 'You can only upload your own photos' });
    }

    const url = `/uploads/${file.filename}`;
    const actualTripId = tripId === 'user' ? null : tripId;

    const savePhoto = () => {
        db.run(
            `INSERT INTO photos (trip_id, user_id, url, caption) VALUES (?, ?, ?, ?)`,
            [actualTripId, userId, url, caption],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to save photo' });
                }

                db.get('SELECT name FROM users WHERE id = ?', [userId], (userErr, userRow) => {
                    if (userErr) {
                        console.error(userErr);
                        return res.status(500).json({ error: 'Failed to load uploader details' });
                    }

                    res.json({
                        success: true,
                        photo: {
                            id: this.lastID,
                            trip_id: actualTripId,
                            user_id: userId,
                            url,
                            caption,
                            user_name: userRow?.name,
                            uploaded_at: new Date().toISOString()
                        }
                    });
                });
            }
        );
    };

    if (!actualTripId || isPrivilegedUser(req.user)) {
        return savePhoto();
    }

    db.get(
        'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
        [actualTripId, userId],
        (membershipErr, membership) => {
            if (membershipErr) {
                console.error(membershipErr);
                return res.status(500).json({ error: 'Failed to verify trip membership' });
            }

            if (!membership) {
                return res.status(403).json({ error: 'You must be part of the trip to upload photos' });
            }

            savePhoto();
        }
    );
});

module.exports = router;
