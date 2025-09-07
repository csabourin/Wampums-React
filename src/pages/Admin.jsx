// src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import { administrativeService } from '../api/administrativeService';
import './Admin.css';

const Admin = () => {
	const { t } = useTranslation();
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	
	const [loading, setLoading] = useState(true);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [users, setUsers] = useState([]);
	const [subscribers, setSubscribers] = useState([]);
	
	// Notification form state
	const [notificationForm, setNotificationForm] = useState({
		title: '',
		body: '',
		selectedSubscribers: []
	});

	// Initialize data
	useEffect(() => {
		// Check if user has admin role
		if (currentUser?.role !== 'admin') {
			navigate('/dashboard');
			return;
		}

		const initializeData = async () => {
			setLoading(true);
			try {
				await Promise.all([
					fetchUsers(),
					fetchSubscribers()
				]);
			} catch (error) {
				console.error('Error initializing admin panel:', error);
				setNotification({
					message: t('error_loading_data'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, [currentUser, navigate, t]);

	// Fetch users data
	const fetchUsers = async () => {
		try {
			const response = await administrativeService.getUsers();
			if (response.success && response.users) {
				setUsers(response.users);
			}
		} catch (error) {
			console.error('Error fetching users:', error);
			throw error;
		}
	};

	// Fetch subscribers data
	const fetchSubscribers = async () => {
		try {
			const response = await administrativeService.getSubscribers();
			if (response.success && response.subscribers) {
				setSubscribers(response.subscribers);
			}
		} catch (error) {
			console.error('Error fetching subscribers:', error);
			throw error;
		}
	};

	// Handle user role update
	const handleRoleChange = async (userId, newRole) => {
		try {
			const response = await administrativeService.updateUserRole(userId, newRole);
			
			if (response.success) {
				// Update local state
				setUsers(prev => prev.map(user => 
					user.id === userId ? { ...user, role: newRole } : user
				));
				
				setNotification({
					message: t('role_updated_successfully'),
					type: 'success'
				});
			} else {
				throw new Error(response.message || 'Failed to update role');
			}
		} catch (error) {
			console.error('Error updating user role:', error);
			setNotification({
				message: t('error_updating_role'),
				type: 'error'
			});
		}
	};

	// Handle user approval
	const handleUserApproval = async (userId) => {
		try {
			const response = await administrativeService.approveUser(userId);
			
			if (response.success) {
				// Update local state
				setUsers(prev => prev.map(user => 
					user.id === userId ? { ...user, isVerified: true } : user
				));
				
				setNotification({
					message: t('user_approved_successfully'),
					type: 'success'
				});
			} else {
				throw new Error(response.message || 'Failed to approve user');
			}
		} catch (error) {
			console.error('Error approving user:', error);
			setNotification({
				message: t('error_approving_user'),
				type: 'error'
			});
		}
	};

	// Handle subscriber selection for notifications
	const handleSubscriberToggle = (subscriberId) => {
		setNotificationForm(prev => ({
			...prev,
			selectedSubscribers: prev.selectedSubscribers.includes(subscriberId)
				? prev.selectedSubscribers.filter(id => id !== subscriberId)
				: [...prev.selectedSubscribers, subscriberId]
		}));
	};

	// Handle select all subscribers
	const handleSelectAllSubscribers = () => {
		const allSelected = notificationForm.selectedSubscribers.length === subscribers.length;
		setNotificationForm(prev => ({
			...prev,
			selectedSubscribers: allSelected ? [] : subscribers.map(sub => sub.id)
		}));
	};

	// Handle notification form submission
	const handleNotificationSubmit = async (e) => {
		e.preventDefault();
		
		if (!notificationForm.title.trim() || !notificationForm.body.trim()) {
			setNotification({
				message: t('title_and_body_required'),
				type: 'error'
			});
			return;
		}

		if (notificationForm.selectedSubscribers.length === 0) {
			setNotification({
				message: t('select_at_least_one_subscriber'),
				type: 'error'
			});
			return;
		}

		try {
			const response = await administrativeService.sendNotification(
				notificationForm.title.trim(),
				notificationForm.body.trim(),
				notificationForm.selectedSubscribers
			);

			if (response.success) {
				setNotification({
					message: t('notification_sent_successfully'),
					type: 'success'
				});
				
				// Reset form
				setNotificationForm({
					title: '',
					body: '',
					selectedSubscribers: []
				});
			} else {
				throw new Error(response.message || 'Failed to send notification');
			}
		} catch (error) {
			console.error('Error sending notification:', error);
			setNotification({
				message: t('error_sending_notification'),
				type: 'error'
			});
		}
	};

	// Navigate to create organization
	const handleCreateOrganization = () => {
		navigate('/create-organization');
	};

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="admin-page">
			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="page-header">
				<Link to="/dashboard" className="back-link">{t('back_to_dashboard')}</Link>
				<h1>{t('admin_panel')}</h1>
			</div>

			<div className="admin-content">
				{/* Create Organization Button */}
				<div className="admin-section">
					<button
						className="create-org-btn"
						onClick={handleCreateOrganization}
					>
						{t('create_new_organization')}
					</button>
				</div>

				{/* Send Notification Section */}
				<div className="admin-section notification-section">
					<h2>{t('send_notification')}</h2>
					<form onSubmit={handleNotificationSubmit} className="notification-form">
						<div className="form-group">
							<label htmlFor="notification-title">{t('title')}</label>
							<input
								type="text"
								id="notification-title"
								value={notificationForm.title}
								onChange={(e) => setNotificationForm(prev => ({
									...prev,
									title: e.target.value
								}))}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="notification-body">{t('body')}</label>
							<textarea
								id="notification-body"
								rows={4}
								value={notificationForm.body}
								onChange={(e) => setNotificationForm(prev => ({
									...prev,
									body: e.target.value
								}))}
								required
							/>
						</div>

						<div className="form-group">
							<h3>{t('select_recipients')}</h3>
							<div className="subscribers-controls">
								<button
									type="button"
									className="select-all-btn"
									onClick={handleSelectAllSubscribers}
								>
									{notificationForm.selectedSubscribers.length === subscribers.length
										? t('deselect_all')
										: t('select_all')
									}
								</button>
								<span className="selected-count">
									{notificationForm.selectedSubscribers.length} / {subscribers.length} {t('selected')}
								</span>
							</div>
							
							<div className="subscribers-list">
								{subscribers.map(subscriber => (
									<div key={subscriber.id} className="subscriber-item">
										<input
											type="checkbox"
											id={`subscriber-${subscriber.id}`}
											checked={notificationForm.selectedSubscribers.includes(subscriber.id)}
											onChange={() => handleSubscriberToggle(subscriber.id)}
										/>
										<label htmlFor={`subscriber-${subscriber.id}`}>
											{subscriber.email}
										</label>
									</div>
								))}
							</div>
						</div>

						<button type="submit" className="send-notification-btn">
							{t('send_notification')}
						</button>
					</form>
				</div>

				{/* User Management Section */}
				<div className="admin-section user-management-section">
					<h2>{t('user_management')}</h2>
					
					{users.length === 0 ? (
						<div className="no-data">
							<p>{t('no_users_found')}</p>
						</div>
					) : (
						<div className="users-table-container">
							<table className="users-table">
								<thead>
									<tr>
										<th>{t('user')}</th>
										<th>{t('role')}</th>
										<th>{t('verified')}</th>
										<th>{t('actions')}</th>
									</tr>
								</thead>
								<tbody>
									{users.map(user => (
										<tr key={user.id}>
											<td>
												<div className="user-info">
													<span className="user-name">{user.fullName}</span>
													<span className="user-email">{user.email}</span>
												</div>
											</td>
											<td>
												<select
													className="role-select"
													value={user.role}
													onChange={(e) => handleRoleChange(user.id, e.target.value)}
												>
													<option value="parent">{t('parent')}</option>
													<option value="animation">{t('animation')}</option>
													<option value="admin">{t('admin')}</option>
												</select>
											</td>
											<td>
												<span className={`verification-status ${user.isVerified ? 'verified' : 'unverified'}`}>
													{user.isVerified ? '' : 'L'}
													{user.isVerified ? ` ${t('verified')}` : ` ${t('unverified')}`}
												</span>
											</td>
											<td>
												{!user.isVerified && (
													<button
														className="approve-btn"
														onClick={() => handleUserApproval(user.id)}
													>
														{t('approve')}
													</button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Admin;