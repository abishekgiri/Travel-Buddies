import React, { useEffect, useState } from 'react';
import './ToastNotification.css';

const ToastNotification = ({ message, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast-notification ${isVisible ? 'show' : ''}`}>
            <div className="toast-content">
                <div className="toast-icon">💬</div>
                <div className="toast-text">
                    <h4>{message.title}</h4>
                    <p>{message.message}</p>
                </div>
            </div>
        </div>
    );
};

export default ToastNotification;
