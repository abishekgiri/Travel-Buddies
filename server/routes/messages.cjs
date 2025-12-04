const express = require('express');
const db = require('../database.cjs');

const router = express.Router();

// Get conversation between two users
router.get('/conversation/:user1Id/:user2Id', (req, res) => {
    const { user1Id, user2Id } = req.params;

    db.get(
        `SELECT * FROM conversations 
     WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
        [user1Id, user2Id, user2Id, user1Id],
        (err, conversation) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: conversation });
        }
    );
});

// Get messages for a conversation
router.get('/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;

    db.all(
        `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`,
        [conversationId],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: messages });
        }
    );
});

// Get all conversations for a user
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;

    db.all(
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
        [userId, userId, userId],
        (err, conversations) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: conversations });
        }
    );
});

module.exports = router;
