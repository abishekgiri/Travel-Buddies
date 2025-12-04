import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { io } from 'socket.io-client';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const socketRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Connect to socket
        socketRef.current = io(API_URL);
        socketRef.current.emit('user_online', user.id);

        // Listen for notifications
        socketRef.current.on('notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Play sound or show toast here if needed
        });

        // Fetch initial notifications (mock for now, or implement backend endpoint)
        // fetchNotifications();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [user]);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            // Mark all as read locally for now
            setUnreadCount(0);
        }
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button className="notification-btn" onClick={toggleDropdown}>
                🔔
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown glass">
                    <div className="dropdown-header">
                        <h3>Notifications</h3>
                        <button className="clear-btn" onClick={() => setNotifications([])}>Clear All</button>
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <p className="empty-state">No new notifications</p>
                        ) : (
                            notifications.map((notif, index) => (
                                <div key={index} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
                                    <div className="notif-icon">
                                        {notif.type === 'message' ? '💬' :
                                            notif.type === 'expense' ? '💸' :
                                                notif.type === 'trip' ? '✈️' : '📢'}
                                    </div>
                                    <div className="notif-content">
                                        <h4>{notif.title}</h4>
                                        <p>{notif.message}</p>
                                        <span className="notif-time">{new Date().toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
