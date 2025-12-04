const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database.cjs');
const { sendEmail } = require('../utils/email.cjs');

const router = express.Router();

// Register
router.post('/signup', (req, res) => {
    const {
        name, email, password, role, location, destination, age, bio,
        interests, adventures, likes, dislikes, religious_views, relationship_status, avatar, phone
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const sql = `INSERT INTO users (
      name, email, password, role, location, destination, age, bio, 
      interests, adventures, likes, dislikes, religious_views, relationship_status, avatar, phone,
      verification_code, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

        const params = [
            name, email, hash, role || 'customer', location, destination, age, bio,
            JSON.stringify(interests), JSON.stringify(adventures), JSON.stringify(likes),
            JSON.stringify(dislikes), religious_views, relationship_status, avatar, phone,
            verificationCode
        ];

        db.run(sql, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }

            // Send verification email
            sendEmail(email, 'Verify your Travel Buddies Account', `Your verification code is: ${verificationCode}`);

            res.json({ message: 'User created successfully. Please verify your email.', userId: this.lastID });
        });
    });
});

// Verify Email
router.post('/verify-email', (req, res) => {
    const { email, code } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.verification_code !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        db.run('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Email verified successfully' });
        });
    });
});

// Forgot Password
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 3600000; // 1 hour

        db.run('UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?', [resetCode, expires, user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            sendEmail(email, 'Reset your Password', `Your password reset code is: ${resetCode}`);
            res.json({ success: true, message: 'Reset code sent to email' });
        });
    });
});

// Reset Password
router.post('/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.reset_code !== code) {
            return res.status(400).json({ error: 'Invalid reset code' });
        }

        if (user.reset_code_expires < Date.now()) {
            return res.status(400).json({ error: 'Reset code expired' });
        }

        bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run('UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?', [hash, user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: 'Password reset successfully' });
            });
        });
    });
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(400).json({ error: 'User not found.' });
        }

        // Optional: Enforce verification before login
        // if (!user.is_verified) {
        //     return res.status(400).json({ error: 'Please verify your email first.' });
        // }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!result) {
                return res.status(400).json({ error: 'Invalid password.' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                }
            });
        });
    });
});

module.exports = router;
