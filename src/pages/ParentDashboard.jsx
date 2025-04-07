// src/pages/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import LanguageToggle from '../components/common/LanguageToggle/LanguageToggle';
import { participantService } from '../api/participantService';
import { organizationService } from '../api/organizationService';
import './ParentDashboard.css';

const ParentDashboard = () => {
	const { t } = useTranslation();
	const { currentUser, logout } = useAuth();
	const [participants, setParticipants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [formFormats, setFormFormats] = useState({});
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [organizationName, setOrganizationName] = useState('Scouts');
	const [showInstallButton, setShowInstallButton] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				// Fetch participants for the current parent user
				const participantsData = await participantService.fetchParticipantsForParent();
				setParticipants(participantsData);

				// Fetch form formats
				const formats = await organizationService.getOrganizationFormFormats();
				setFormFormats(formats || {});

				// Fetch organization settings
				const settings = await organizationService.getOrganizationSettings();
				if (settings && settings.organization_info && settings.organization_info.name) {
					setOrganizationName(settings.organization_info.name);
				}

				// Check if there are any guardian participants to link
				const guardianParticipants = JSON.parse(localStorage.getItem("guardianParticipants"));
				if (guardianParticipants && guardianParticipants.length > 0) {
					showLinkParticipantsDialog(guardianParticipants);
					localStorage.removeItem("guardianParticipants"); // Clear after showing
				}
			} catch (error) {
				console.error('Error fetching data:', error);
				setNotification({
					message: error.message || t('error_loading_data'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		fetchData();

		// Setup PWA install prompt listener
		const handleBeforeInstallPrompt = (e) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();
			// Stash the event so it can be triggered later
			setDeferredPrompt(e);
			// Update UI to show the install button
			setShowInstallButton(true);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	}, [t]);

	const showLinkParticipantsDialog = (guardianParticipants) => {
		// Create a modal dialog to ask user if they want to link these participants
		const dialog = document.createElement('div');
		dialog.className = 'link-participants-dialog';
		dialog.innerHTML = `
			<div class="dialog-content">
				<h2>${t('link_existing_participants')}</h2>
				<p>${t('existing_participants_found')}</p>
				<form id="link-participants-form">
					${guardianParticipants.map(participant => `
						<label class="checkbox-label">
							<input type="checkbox" name="link_participants" value="${participant.participant_id}">
							${participant.first_name} ${participant.last_name}
						</label>
					`).join('')}
					<div class="dialog-buttons">
						<button type="submit" class="btn btn-primary">${t('link_selected_participants')}</button>
						<button id="cancel-link" type="button" class="btn btn-secondary">${t('cancel')}</button>
					</div>
				</form>
			</div>
		`;

		document.body.appendChild(dialog);

		// Add event listeners
		document.getElementById('cancel-link').addEventListener('click', () => {
			document.body.removeChild(dialog);
		});

		document.getElementById('link-participants-form').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const selectedParticipants = formData.getAll('link_participants');

			if (selectedParticipants.length > 0) {
				try {
					const result = await participantService.linkUserParticipants(selectedParticipants);
					if (result.success) {
						setNotification({
							message: t('participants_linked_successfully'),
							type: 'success'
						});
						// Refresh the participants list
						const updatedParticipants = await participantService.fetchParticipantsForParent();
						setParticipants(updatedParticipants);
					} else {
						setNotification({
							message: result.message || t('error_linking_participants'),
							type: 'error'
						});
					}
				} catch (error) {
					console.error('Error linking participants:', error);
					setNotification({
						message: t('error_linking_participants'),
						type: 'error'
					});
				}
			}

			document.body.removeChild(dialog);
		});
	};

	const handleLogout = async () => {
		try {
			await logout();
			// Navigation will happen automatically thanks to the router
		} catch (error) {
			console.error('Logout error:', error);
			setNotification({
				message: t('logout_error'),
				type: 'error'
			});
		}
	};

	const handleInstallClick = async () => {
		if (!deferredPrompt) {
			return;
		}

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);

		// We've used the prompt, and can't use it again, throw it away
		setDeferredPrompt(null);
		// Hide the install button
		setShowInstallButton(false);
	};

	// Request notification permission
	const requestNotificationPermission = async () => {
		if ('Notification' in window) {
			try {
				const permission = await Notification.requestPermission();
				if (permission === 'granted') {
					registerPushSubscription();
					setNotification({
						message: t('notifications_enabled'),
						type: 'success'
					});
				} else {
					setNotification({
						message: t('notifications_denied'),
						type: 'warning'
					});
				}
			} catch (error) {
				console.error('Error requesting notification permission:', error);
				setNotification({
					message: t('error_requesting_notification_permission'),
					type: 'error'
				});
			}
		} else {
			setNotification({
				message: t('notifications_not_supported'),
				type: 'warning'
			});
		}
	};

	const registerPushSubscription = async () => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			try {
				const registration = await navigator.serviceWorker.ready;
				const applicationServerKey = urlBase64ToUint8Array('BPsOyoPVxNCN6BqsLdHwc5aaNPERFO2yq-xF3vqHJ7CdMlHRn5EBPnxcoOKGkeIO1_9zHnF5CRyD6RvLlOKPcTE');
				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey
				});

				// Send subscription to server
				await fetch('/save-subscription.php', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
					},
					body: JSON.stringify(subscription)
				});

				console.log('Push subscription successful');
			} catch (error) {
				console.error('Error registering for push notifications:', error);
			}
		}
	};

	// Helper function to convert base64 to Uint8Array
	const urlBase64ToUint8Array = (base64String) => {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding)
			.replace(/-/g, '+')
			.replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	};

	// Check if notification button should be shown
	const shouldShowNotificationButton = () => {
		return 'Notification' in window && 
			(Notification.permission === 'default' || Notification.permission === 'denied');
	};

	// Render form buttons for each form type
	const renderFormButtons = (participant) => {
		return Object.keys(formFormats)
			.filter(formType => {
				// Exclude 'participant_registration' and 'parent_guardian' for all users
				return formType !== 'participant_registration' && formType !== 'parent_guardian';
			})
			.map(formType => {
				const formLabel = t(formType);
				const isCompleted = participant[`has_${formType}`] === 1 || participant[`has_${formType}`] === true;
				const status = isCompleted ? "✅" : "❌";

				return (
					<Link 
						key={formType} 
						to={`/dynamic-form/${formType}/${participant.id}`}
						className="form-link"
					>
						{status} {formLabel}
					</Link>
				);
			});
	};

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="parent-dashboard">
			<LanguageToggle />

			{notification.message && (
				<Notification 
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="dashboard-header">
				<h1>{t('welcome')} {currentUser?.fullName}</h1>
				<h2>{organizationName}</h2>

				{/* Show back to admin dashboard link for admin users */}
				{currentUser?.role === 'admin' || currentUser?.role === 'animation' ? (
					<Link to="/dashboard" className="back-link">{t('back_to_dashboard')}</Link>
				) : null}
			</div>

			<div className="dashboard-content">
				<nav>
					<ul className="dashboard-menu">
						{/* Add participant button */}
						<li>
							<Link to="/formulaire-inscription" className="dashboard-button">
								{t('add_participant')}
							</Link>
						</li>

						{/* Notification button */}
						{shouldShowNotificationButton() && (
							<li>
								<button 
									onClick={requestNotificationPermission} 
									className="dashboard-button"
								>
									{t('enable_notifications')}
								</button>
							</li>
						)}

						{/* Install PWA button */}
						{showInstallButton && (
							<li>
								<button 
									onClick={handleInstallClick} 
									className="dashboard-button"
								>
									{t('install_app')}
								</button>
							</li>
						)}

						{/* Logout button */}
						<li>
							<button 
								onClick={handleLogout} 
								className="dashboard-button logout-button"
							>
								{t('logout')}
							</button>
						</li>
					</ul>
				</nav>

				{/* Participants list */}
				<section className="participants-section">
					<h2>{t('your_participants')}</h2>

					{participants.length === 0 ? (
						<p className="no-participants">{t('no_participants')}</p>
					) : (
						<div className="participants-list">
							{participants.map(participant => (
								<div key={participant.id} className="participant-card">
									<h3>{participant.first_name} {participant.last_name}</h3>

									<Link 
										to={`/formulaire-inscription/${participant.id}`} 
										className="edit-button"
									>
										{t('edit')}
									</Link>

									<div className="participant-actions">
										{renderFormButtons(participant)}

										<Link 
											to={`/badge-form/${participant.id}`}
											className="form-link badge-link"
										>
											{t('manage_badge_progress')}
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default ParentDashboard;