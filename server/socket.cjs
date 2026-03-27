const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./database.cjs');

let io;

const onlineUsers = new Map();

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
    });
});

const isPrivilegedUser = (user) => user && (user.role === 'owner' || user.role === 'admin');

const addOnlineSocket = (userId, socketId) => {
    const sockets = onlineUsers.get(userId) || new Set();
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    onlineUsers.set(userId, sockets);
    return wasOffline;
};

const removeOnlineSocket = (userId, socketId) => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) {
        return false;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
        onlineUsers.delete(userId);
        return true;
    }

    onlineUsers.set(userId, sockets);
    return false;
};

const emitToUser = (userId, event, payload) => {
    const socketIds = onlineUsers.get(userId);
    if (!socketIds) {
        return;
    }

    socketIds.forEach((socketId) => {
        io.to(socketId).emit(event, payload);
    });
};

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                process.env.CLIENT_URL
            ].filter(Boolean),
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            if (!process.env.JWT_SECRET) {
                return next(new Error('JWT secret is not configured'));
            }

            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (error) {
            next(new Error('Invalid authentication token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.id;
        const becameOnline = addOnlineSocket(userId, socket.id);

        if (becameOnline) {
            io.emit('user_status', { userId, status: 'online' });
        }

        socket.emit('online_users', Array.from(onlineUsers.keys()));

        socket.on('user_online', () => {
            socket.emit('online_users', Array.from(onlineUsers.keys()));
        });

        socket.on('join_conversation', ({ otherUserId }) => {
            if (!otherUserId) {
                return;
            }

            const roomId = [userId, otherUserId].sort((a, b) => a - b).join('-');
            socket.join(roomId);
        });

        socket.on('send_message', async ({ receiverId, message }) => {
            if (!receiverId || !message) {
                return;
            }

            try {
                const conversationId = await getOrCreateConversation(userId, receiverId);
                const senderProfile = await dbGet(
                    'SELECT name, avatar FROM users WHERE id = ?',
                    [userId]
                );
                const insertResult = await dbRun(
                    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message) 
                     VALUES (?, ?, ?, ?)`,
                    [conversationId, userId, receiverId, message]
                );

                await dbRun(
                    `UPDATE conversations 
                     SET last_message = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [message, conversationId]
                );

                const messageData = {
                    id: insertResult.lastID,
                    conversation_id: conversationId,
                    sender_id: userId,
                    receiver_id: receiverId,
                    sender_name: senderProfile?.name,
                    sender_avatar: senderProfile?.avatar,
                    message,
                    created_at: new Date().toISOString(),
                    read: false
                };

                const roomId = [userId, receiverId].sort((a, b) => a - b).join('-');
                io.to(roomId).emit('new_message', messageData);

                emitToUser(receiverId, 'notification', {
                    type: 'message',
                    title: 'New Message',
                    message: `${senderProfile?.name || 'Someone'} sent you a message`,
                    link: '/chat',
                    read: false,
                    data: messageData
                });

                emitToUser(receiverId, 'message_notification', {
                    from: userId,
                    message: messageData
                });
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });

        socket.on('typing', ({ receiverId }) => {
            if (!receiverId) {
                return;
            }

            emitToUser(receiverId, 'user_typing', { userId });
        });

        socket.on('stop_typing', ({ receiverId }) => {
            if (!receiverId) {
                return;
            }

            emitToUser(receiverId, 'user_stop_typing', { userId });
        });

        socket.on('mark_read', async ({ conversationId }) => {
            if (!conversationId) {
                return;
            }

            try {
                await dbRun(
                    `UPDATE messages 
                     SET read = 1 
                     WHERE conversation_id = ? AND receiver_id = ? AND read = 0`,
                    [conversationId, userId]
                );
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('join_trip', async (tripId) => {
            if (!tripId) {
                return;
            }

            try {
                const membership = await dbGet(
                    'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
                    [tripId, userId]
                );

                if (!membership && !isPrivilegedUser(socket.user)) {
                    return;
                }

                socket.join(`trip_${tripId}`);
            } catch (error) {
                console.error('Error joining trip room:', error);
            }
        });

        socket.on('send_trip_message', async ({ tripId, messageId, message }) => {
            if (!tripId) {
                return;
            }

            try {
                const membership = await dbGet(
                    'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
                    [tripId, userId]
                );

                if (!membership && !isPrivilegedUser(socket.user)) {
                    return;
                }

                let messageData = null;

                if (messageId) {
                    messageData = await dbGet(
                        `SELECT tm.*, u.name as sender_name, u.avatar as sender_avatar
                         FROM trip_messages tm
                         JOIN users u ON tm.sender_id = u.id
                         WHERE tm.id = ? AND tm.trip_id = ?`,
                        [messageId, tripId]
                    );
                }

                if (!messageData && message) {
                    const senderProfile = await dbGet(
                        'SELECT name, avatar FROM users WHERE id = ?',
                        [userId]
                    );
                    messageData = {
                        id: Date.now(),
                        trip_id: tripId,
                        sender_id: userId,
                        sender_name: senderProfile?.name,
                        sender_avatar: senderProfile?.avatar,
                        message,
                        created_at: new Date().toISOString(),
                        is_pinned: false
                    };
                }

                if (messageData) {
                    io.to(`trip_${tripId}`).emit('new_trip_message', messageData);
                }
            } catch (error) {
                console.error('Error sending trip message:', error);
            }
        });

        socket.on('disconnect', () => {
            const becameOffline = removeOnlineSocket(userId, socket.id);
            if (becameOffline) {
                io.emit('user_status', { userId, status: 'offline' });
            }
        });
    });

    return io;
};

const getOrCreateConversation = (user1Id, user2Id) => {
    return new Promise((resolve, reject) => {
        const [smallerId, largerId] = [user1Id, user2Id].sort((a, b) => a - b);

        db.get(
            `SELECT id FROM conversations 
             WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
            [smallerId, largerId, largerId, smallerId],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row) {
                    resolve(row.id);
                } else {
                    db.run(
                        `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
                        [smallerId, largerId],
                        function (insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                                return;
                            }
                            resolve(this.lastID);
                        }
                    );
                }
            }
        );
    });
};

module.exports = { initializeSocket };
