import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import io from 'socket.io-client';
import './TripChat.css';

const TripChat = ({ tripId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Connect to socket
        const newSocket = io(API_URL);
        setSocket(newSocket);

        newSocket.emit('user_online', user.id);
        newSocket.emit('join_trip', tripId);

        newSocket.on('new_trip_message', (message) => {
            setMessages((prev) => {
                // Avoid duplicates if we optimistically added it or if socket sends it back
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        });

        fetchMessages();

        return () => newSocket.disconnect();
    }, [tripId, user.id]);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`);
            const data = await response.json();
            if (data.success) {
                setMessages(data.data);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageContent = newMessage;
        setNewMessage('');

        try {
            // Send to backend
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: user.id,
                    message: messageContent
                })
            });
            const data = await response.json();

            if (data.success) {
                // Emit to socket for others
                socket.emit('send_trip_message', {
                    tripId,
                    message: messageContent,
                    senderId: user.id,
                    senderName: user.name,
                    senderAvatar: user.avatar
                });

                // We rely on the socket to update our own UI to keep it in sync
                // But we could also update state here with data.data
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handlePinMessage = async (messageId, currentStatus) => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages/${messageId}/pin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_pinned: !currentStatus })
            });

            if (response.ok) {
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, is_pinned: !currentStatus } : m
                ));
            }
        } catch (error) {
            console.error('Failed to pin message:', error);
        }
    };

    const pinnedMessages = messages.filter(m => m.is_pinned);

    return (
        <div className="trip-chat glass">
            <div className="chat-header">
                <h3>💬 Trip Chat</h3>
            </div>

            {pinnedMessages.length > 0 && (
                <div className="pinned-messages">
                    <h4>📌 Pinned</h4>
                    {pinnedMessages.map(msg => (
                        <div key={msg.id} className="pinned-item">
                            <span className="pinned-sender">{msg.sender_name}: </span>
                            <span className="pinned-text">{msg.message}</span>
                            <button
                                className="unpin-btn"
                                onClick={() => handlePinMessage(msg.id, true)}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="messages-list">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message-item ${msg.sender_id === user.id ? 'own-message' : ''}`}
                    >
                        {msg.sender_id !== user.id && (
                            <div className="message-avatar">
                                {msg.sender_avatar && (msg.sender_avatar.startsWith('/') || msg.sender_avatar.startsWith('http')) ? (
                                    <img src={msg.sender_avatar.startsWith('/') ? `${API_URL}${msg.sender_avatar}` : msg.sender_avatar} alt={msg.sender_name} />
                                ) : (
                                    <span>{msg.sender_avatar || '👤'}</span>
                                )}
                            </div>
                        )}
                        <div className="message-content">
                            {msg.sender_id !== user.id && <div className="message-sender">{msg.sender_name}</div>}
                            <div className="message-bubble">
                                {msg.message}
                            </div>
                            <div className="message-actions">
                                <span className="message-time">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                    className={`pin-btn ${msg.is_pinned ? 'active' : ''}`}
                                    onClick={() => handlePinMessage(msg.id, msg.is_pinned)}
                                    title="Pin Message"
                                >
                                    📌
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button type="submit" className="send-btn">
                    ➤
                </button>
            </form>
        </div>
    );
};

export default TripChat;
