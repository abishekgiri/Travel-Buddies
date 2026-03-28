import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_URL, createAuthHeaders, createSocketOptions } from '../config';
import io from 'socket.io-client';
import './TripChat.css';

const TripChat = ({ tripId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`, {
                headers: createAuthHeaders()
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch messages');
            }

            setMessages(data.data || []);
            setError('');
            scrollToBottom();
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scrollToBottom, tripId, user]);

    useEffect(() => {
        if (!user) {
            setMessages([]);
            setError('');
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        const newSocket = io(API_URL, createSocketOptions());
        socketRef.current = newSocket;

        newSocket.emit('user_online');
        newSocket.emit('join_trip', tripId);

        newSocket.on('new_trip_message', (message) => {
            setMessages((prev) => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        });

        fetchMessages();

        return () => {
            newSocket.disconnect();
        };
    }, [fetchMessages, scrollToBottom, tripId, user]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        const messageContent = newMessage;
        setNewMessage('');

        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`, {
                method: 'POST',
                headers: createAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    message: messageContent
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setError('');
            socketRef.current?.emit('send_trip_message', {
                tripId,
                messageId: data.data.id
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setError(error.message);
            setNewMessage(messageContent);
        }
    };

    const handlePinMessage = async (messageId, currentStatus) => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}/messages/${messageId}/pin`, {
                method: 'PUT',
                headers: createAuthHeaders({ 'Content-Type': 'application/json' }),
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

    if (!user) {
        return (
            <div className="trip-chat glass">
                <div className="chat-header">
                    <h3>💬 Trip Chat</h3>
                </div>
                <div className="trip-chat-state">Log in and join this trip to access the group chat.</div>
            </div>
        );
    }

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
                {loading ? (
                    <div className="trip-chat-state">Loading chat...</div>
                ) : error ? (
                    <div className="trip-chat-state">{error}</div>
                ) : (
                    messages.map((msg) => (
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
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                    disabled={loading || Boolean(error)}
                />
                <button type="submit" className="send-btn" disabled={loading || Boolean(error) || !newMessage.trim()}>
                    ➤
                </button>
            </form>
        </div>
    );
};

export default TripChat;
