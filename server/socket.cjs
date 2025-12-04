const { Server } = require('socket.io');
const db = require('./database.cjs');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:5173",
                process.env.CLIENT_URL
            ].filter(Boolean), // Remove undefined if env var is missing
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Store online users
    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User joins with their ID
        socket.on('user_online', (userId) => {
            onlineUsers.set(userId, socket.id);
            socket.userId = userId;

            // Broadcast online status to all users
            io.emit('user_status', { userId, status: 'online' });

            // Send list of online users to the newly connected user
            const onlineUserIds = Array.from(onlineUsers.keys());
            socket.emit('online_users', onlineUserIds);
        });

        // Join a conversation room
        socket.on('join_conversation', ({ userId, otherUserId }) => {
            const roomId = [userId, otherUserId].sort().join('-');
            socket.join(roomId);
            console.log(`User ${userId} joined room ${roomId}`);
        });

        // Send message
        socket.on('send_message', async ({ senderId, receiverId, message }) => {
            console.log('📨 Message received from client:', { senderId, receiverId, message });
            try {
                // Get or create conversation
                const conversationId = await getOrCreateConversation(senderId, receiverId);
                console.log('💬 Conversation ID:', conversationId);

                // Save message to database
                db.run(
                    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message) 
           VALUES (?, ?, ?, ?)`,
                    [conversationId, senderId, receiverId, message],
                    function (err) {
                        if (err) {
                            console.error('❌ Error saving message:', err);
                            return;
                        }

                        const messageData = {
                            id: this.lastID,
                            conversation_id: conversationId,
                            sender_id: senderId,
                            receiver_id: receiverId,
                            message,
                            created_at: new Date().toISOString(),
                            read: false
                        };

                        console.log('✅ Message saved to DB:', messageData);

                        // Update conversation last message
                        db.run(
                            `UPDATE conversations 
               SET last_message = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
                            [message, conversationId]
                        );

                        // Send to room
                        const roomId = [senderId, receiverId].sort().join('-');
                        console.log('📤 Emitting to room:', roomId);
                        io.to(roomId).emit('new_message', messageData);

                        // Notify receiver if online
                        const receiverSocketId = onlineUsers.get(receiverId);
                        if (receiverSocketId) {
                            console.log('🔔 Notifying receiver:', receiverId);
                            // Emit standardized notification
                            io.to(receiverSocketId).emit('notification', {
                                type: 'message',
                                title: 'New Message',
                                message: `You have a new message`, // Ideally include sender name if available
                                link: '/chat',
                                read: false,
                                data: messageData
                            });

                            // Keep legacy event for backward compatibility if needed
                            io.to(receiverSocketId).emit('message_notification', {
                                from: senderId,
                                message: messageData
                            });
                        }
                    }
                );
            } catch (error) {
                console.error('❌ Error sending message:', error);
            }
        });

        // Typing indicator
        socket.on('typing', ({ senderId, receiverId }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', { userId: senderId });
            }
        });

        socket.on('stop_typing', ({ senderId, receiverId }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_stop_typing', { userId: senderId });
            }
        });

        // Mark messages as read
        socket.on('mark_read', ({ conversationId, userId }) => {
            db.run(
                `UPDATE messages 
         SET read = 1 
         WHERE conversation_id = ? AND receiver_id = ? AND read = 0`,
                [conversationId, userId]
            );
        });

        // Join trip room
        socket.on('join_trip', (tripId) => {
            const roomId = `trip_${tripId}`;
            socket.join(roomId);
            console.log(`User ${socket.userId} joined trip room ${roomId}`);
        });

        // Send trip message
        socket.on('send_trip_message', ({ tripId, message, senderId, senderName, senderAvatar }) => {
            const roomId = `trip_${tripId}`;
            const messageData = {
                id: Date.now(), // Temporary ID for immediate display, DB will assign real one
                trip_id: tripId,
                sender_id: senderId,
                sender_name: senderName,
                sender_avatar: senderAvatar,
                message,
                created_at: new Date().toISOString(),
                is_pinned: false
            };

            // Broadcast to everyone in the room INCLUDING sender (for simplicity in this implementation)
            io.to(roomId).emit('new_trip_message', messageData);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                io.emit('user_status', { userId: socket.userId, status: 'offline' });
            }
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

// Helper function to get or create conversation
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
                    // Create new conversation
                    db.run(
                        `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
                        [smallerId, largerId],
                        function (err) {
                            if (err) {
                                reject(err);
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
