import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL, createAuthHeaders, createSocketOptions } from '../config';
import { io } from 'socket.io-client';
import './Chat.css';

const Chat = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: createAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            const otherUsers = data.data.filter(u => u.id !== user?.id);
            console.log('Chat users loaded:', otherUsers.map(u => ({ name: u.name, avatar: u.avatar })));
            setUsers(otherUsers);

            const travelerFromState = location.state?.startChatWith;
            const selectedTraveler = travelerFromState || (
                localStorage.getItem('selectedTraveler')
                    ? JSON.parse(localStorage.getItem('selectedTraveler'))
                    : null
            );

            if (selectedTraveler) {
                setActiveChat(selectedTraveler.id);
                localStorage.removeItem('selectedTraveler');
            } else if (otherUsers.length > 0) {
                setActiveChat((prev) => prev ?? otherUsers[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [location.state, user?.id]);

    const fetchMessages = useCallback(async () => {
        if (!activeChat || !user) {
            return;
        }

        try {
            const convResponse = await fetch(
                `${API_URL}/api/messages/conversation/${user.id}/${activeChat}`,
                { headers: createAuthHeaders() }
            );
            const convData = await convResponse.json();

            if (convData.data) {
                const msgResponse = await fetch(
                    `${API_URL}/api/messages/messages/${convData.data.id}`,
                    { headers: createAuthHeaders() }
                );
                const msgData = await msgResponse.json();
                setMessages(msgData.data || []);

                socketRef.current?.emit('mark_read', {
                    conversationId: convData.data.id
                });
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    }, [activeChat, user]);

    useEffect(() => {
        if (!user) return;

        // Initialize Socket.IO connection
        socketRef.current = io(API_URL, createSocketOptions());

        console.log('Socket.IO connecting...');

        // User comes online
        socketRef.current.emit('user_online');

        // Listen for online users
        socketRef.current.on('online_users', (userIds) => {
            console.log('Online users:', userIds);
            setOnlineUsers(userIds);
        });

        // Listen for user status changes
        socketRef.current.on('user_status', ({ userId, status }) => {
            console.log('User status changed:', userId, status);
            setOnlineUsers(prev => {
                if (status === 'online') {
                    return [...new Set([...prev, userId])];
                } else {
                    return prev.filter(id => id !== userId);
                }
            });
        });

        // Listen for new messages
        socketRef.current.on('new_message', (message) => {
            console.log('New message received:', message);
            setMessages(prev => [...prev, message]);
        });

        // Listen for typing indicators
        socketRef.current.on('user_typing', ({ userId }) => {
            setTypingUsers(prev => new Set([...prev, userId]));
        });

        socketRef.current.on('user_stop_typing', ({ userId }) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        fetchUsers();

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [fetchUsers, user]);

    useEffect(() => {
        if (activeChat && user) {
            fetchMessages();
            // Join conversation room
            socketRef.current?.emit('join_conversation', {
                otherUserId: activeChat
            });
        }
    }, [activeChat, fetchMessages, user]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeChat) return;

        console.log('Sending message:', {
            senderId: user.id,
            receiverId: activeChat,
            message: messageInput.trim()
        });

        // Send via Socket.IO
        socketRef.current?.emit('send_message', {
            receiverId: activeChat,
            message: messageInput.trim()
        });

        setMessageInput('');

        // Stop typing indicator
        socketRef.current?.emit('stop_typing', {
            receiverId: activeChat
        });
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);

        if (!activeChat) return;

        // Send typing indicator
        socketRef.current?.emit('typing', {
            receiverId: activeChat
        });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('stop_typing', {
                receiverId: activeChat
            });
        }, 2000);
    };

    const activeUser = users.find(u => u.id === activeChat);
    const isOnline = onlineUsers.includes(activeChat);
    const isTyping = typingUsers.has(activeChat);

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}>Loading...</div>;

    return (
        <div className="chat-page container">
            <div className="chat-container glass">
                <div className="chat-sidebar">
                    <div className="sidebar-header">
                        <h2>Messages</h2>
                    </div>
                    <div className="chat-list">
                        {users.map(chatUser => (
                            <div
                                key={chatUser.id}
                                className={`chat-item ${activeChat === chatUser.id ? 'active' : ''}`}
                                onClick={() => setActiveChat(chatUser.id)}
                            >
                                <div className="avatar-container">
                                    <div className="avatar">
                                        {chatUser.avatar && chatUser.avatar.startsWith('/uploads') ? (
                                            <img src={`${API_URL}${chatUser.avatar}`} alt={chatUser.name} />
                                        ) : (
                                            <span>{chatUser.avatar || '👤'}</span>
                                        )}
                                    </div>
                                    {onlineUsers.includes(chatUser.id) && (
                                        <span className="online-indicator"></span>
                                    )}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name-time">
                                        <h4>{chatUser.name}</h4>
                                        <span>{onlineUsers.includes(chatUser.id) ? 'Online' : 'Offline'}</span>
                                    </div>
                                    <p className="last-message">
                                        {chatUser.destination ? `Planning to go to ${chatUser.destination}` : 'Start a conversation'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chat-main">
                    {activeUser ? (
                        <>
                            <div className="chat-header">
                                <div className="avatar-container">
                                    <div className="avatar">
                                        {activeUser.avatar && activeUser.avatar.startsWith('/uploads') ? (
                                            <img src={`${API_URL}${activeUser.avatar}`} alt={activeUser.name} />
                                        ) : (
                                            <span>{activeUser.avatar || '👤'}</span>
                                        )}
                                    </div>
                                    {isOnline && <span className="online-indicator"></span>}
                                </div>
                                <div className="header-info">
                                    <h3>{activeUser.name}</h3>
                                    <span className="status">
                                        {isOnline ? '🟢 Online' : '⚫ Offline'}
                                        {activeUser.location && ` • 📍 ${activeUser.location}`}
                                    </span>
                                </div>
                            </div>

                            <div className="messages-area">
                                {messages.length === 0 ? (
                                    <div className="empty-chat">
                                        <div className="empty-icon">💬</div>
                                        <h3>Start a conversation with {activeUser.name}</h3>
                                        <p>Say hello and plan your next adventure together!</p>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`message ${msg.sender_id === user.id ? 'me' : 'other'}`}
                                            >
                                                <div className="message-bubble">
                                                    {msg.message}
                                                </div>
                                                <span className="message-time">
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                        {isTyping && (
                                            <div className="typing-indicator">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <form className="message-input-area" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder={`Message ${activeUser.name}...`}
                                    value={messageInput}
                                    onChange={handleTyping}
                                />
                                <button type="submit" className="btn-primary send-btn">
                                    Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <h3>No users available</h3>
                            <p>Create more accounts or wait for other travelers to join!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;
