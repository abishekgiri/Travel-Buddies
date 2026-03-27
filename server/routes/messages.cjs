const express = require('express');
const db = require('../database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

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

// Get conversation between two users
router.get('/conversation/:user1Id/:user2Id', verifyToken, async (req, res) => {
    const { user1Id, user2Id } = req.params;
    const requestedIds = [Number(user1Id), Number(user2Id)];

    if (!requestedIds.includes(req.user.id)) {
        return res.status(403).json({ error: 'You can only access your own conversations' });
    }

    try {
        const conversation = await dbGet(
            `SELECT * FROM conversations 
             WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
            [user1Id, user2Id, user2Id, user1Id]
        );

        res.json({ success: true, data: conversation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a conversation
router.get('/messages/:conversationId', verifyToken, async (req, res) => {
    const { conversationId } = req.params;

    try {
        const conversation = await dbGet(
            'SELECT * FROM conversations WHERE id = ?',
            [conversationId]
        );

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (![conversation.user1_id, conversation.user2_id].includes(req.user.id)) {
            return res.status(403).json({ error: 'You do not have access to these messages' });
        }

        const messages = await dbAll(
            `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC`,
            [conversationId]
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all conversations for a user
router.get('/user/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const requestedUserId = Number(userId);

    if (req.user.id !== requestedUserId) {
        return res.status(403).json({ error: 'You can only access your own conversations' });
    }

    try {
        const conversations = await dbAll(
            `SELECT c.*, 
                u1.name as user1_name, u1.avatar as user1_avatar,
                u2.name as user2_name, u2.avatar as user2_avatar,
                (SELECT COUNT(*) FROM messages 
                 WHERE conversation_id = c.id 
                 AND receiver_id = ? 
                 AND read = 0) as unread_count
             FROM conversations c
             JOIN users u1 ON c.user1_id = u1.id
             JOIN users u2 ON c.user2_id = u2.id
             WHERE c.user1_id = ? OR c.user2_id = ?
             ORDER BY c.updated_at DESC`,
            [requestedUserId, requestedUserId, requestedUserId]
        );

        res.json({ success: true, data: conversations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
