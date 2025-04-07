// src/components/common/Notification/Notification.jsx
import React, { useState, useEffect } from 'react';
import './Notification.css';

/**
 * Notification component to display temporary messages
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds to display the notification
 * @param {function} onClose - Callback function when notification is closed
 */
const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (!message) {
			setVisible(false);
			return;
		}

		setVisible(true);

		const timer = setTimeout(() => {
			setVisible(false);
			if (onClose) onClose();
		}, duration);

		return () => clearTimeout(timer);
	}, [message, duration, onClose]);

	if (!message || !visible) return null;

	return (
		<div className={`notification notification-${type}`}>
			<div className="notification-content">{message}</div>
			<button className="notification-close" onClick={() => {
				setVisible(false);
				if (onClose) onClose();
			}}>
				×
			</button>
		</div>
	);
};

export default Notification;