const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../database.cjs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.body.type || 'profiles';
        const dir = `server/uploads/${uploadType}`;

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Upload profile picture
router.post('/profile', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        // Compress and resize image
        const outputPath = req.file.path.replace(path.extname(req.file.path), '-compressed.jpg');
        await sharp(req.file.path)
            .resize(400, 400, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(outputPath);

        // Delete original file
        fs.unlinkSync(req.file.path);

        // Generate URL
        const imageUrl = `/uploads/profiles/${path.basename(outputPath)}`;

        // Update user's avatar in database
        db.run(
            'UPDATE users SET avatar = ? WHERE id = ?',
            [imageUrl, userId],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, url: imageUrl });
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload trip photo
router.post('/trip', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { userId, tripId, caption } = req.body;
        if (!userId || !tripId) {
            return res.status(400).json({ error: 'User ID and Trip ID required' });
        }

        // Compress and resize image
        const outputPath = req.file.path.replace(path.extname(req.file.path), '-compressed.jpg');
        await sharp(req.file.path)
            .resize(1200, 800, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toFile(outputPath);

        // Delete original file
        fs.unlinkSync(req.file.path);

        // Generate URL
        const imageUrl = `/uploads/trips/${path.basename(outputPath)}`;

        // Save to photos table
        db.run(
            'INSERT INTO photos (user_id, trip_id, url, caption) VALUES (?, ?, ?, ?)',
            [userId, tripId, imageUrl, caption || null],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({
                    success: true,
                    photo: {
                        id: this.lastID,
                        url: imageUrl,
                        caption
                    }
                });
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get photos for a trip
router.get('/trip/:tripId', (req, res) => {
    const { tripId } = req.params;

    db.all(
        `SELECT p.*, u.name as uploader_name 
     FROM photos p
     JOIN users u ON p.user_id = u.id
     WHERE p.trip_id = ?
     ORDER BY p.uploaded_at DESC`,
        [tripId],
        (err, photos) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: photos });
        }
    );
});

// Get photos for a user
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;

    db.all(
        'SELECT * FROM photos WHERE user_id = ? ORDER BY uploaded_at DESC',
        [userId],
        (err, photos) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: photos });
        }
    );
});

// Delete photo
router.delete('/:photoId', (req, res) => {
    const { photoId } = req.params;

    // Get photo info first
    db.get('SELECT * FROM photos WHERE id = ?', [photoId], (err, photo) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', photo.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        db.run('DELETE FROM photos WHERE id = ?', [photoId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Photo deleted' });
        });
    });
});

module.exports = router;
