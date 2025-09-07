// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import LanguageToggle from '../components/common/LanguageToggle/LanguageToggle';
import { organizationService } from '../api/organizationService';
import './Login.css';

const ResetPassword = () => {
	const { t } = useTranslation();
	const { resetPassword, loading } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	
	const [email, setEmail] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [organizationName, setOrganizationName] = useState('Scouts');
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [isRequestMode, setIsRequestMode] = useState(true);
	
	// Check if we have a reset token in the URL
	const resetToken = searchParams.get('token');
	const resetEmail = searchParams.get('email');

	useEffect(() => {
		// If we have token and email in URL, switch to reset mode
		if (resetToken && resetEmail) {
			setIsRequestMode(false);
			setEmail(resetEmail);
		}

		// Fetch organization settings on component mount
		const fetchOrganizationInfo = async () => {
			try {
				const settings = await organizationService.getOrganizationSettings();
				if (settings && settings.organization_info && settings.organization_info.name) {
					setOrganizationName(settings.organization_info.name);
				}
			} catch (error) {
				console.error('Error fetching organization info:', error);
			}
		};

		fetchOrganizationInfo();
	}, [resetToken, resetEmail]);

	const handleRequestReset = async (e) => {
		e.preventDefault();

		if (!email.trim()) {
			setNotification({
				message: t('email_required'),
				type: 'error'
			});
			return;
		}

		try {
			const result = await resetPassword({ email: email.trim() });

			if (result.success) {
				setNotification({
					message: result.message || t('reset_email_sent'),
					type: 'success'
				});
			} else {
				throw new Error(result.message || 'Failed to send reset email');
			}
		} catch (error) {
			console.error('Password reset request error:', error);
			setNotification({
				message: error.message || t('reset_request_error'),
				type: 'error'
			});
		}
	};

	const handlePasswordReset = async (e) => {
		e.preventDefault();

		// Validate inputs
		if (!newPassword.trim() || !confirmPassword.trim()) {
			setNotification({
				message: t('all_fields_required'),
				type: 'error'
			});
			return;
		}

		if (newPassword !== confirmPassword) {
			setNotification({
				message: t('passwords_do_not_match'),
				type: 'error'
			});
			return;
		}

		if (newPassword.length < 6) {
			setNotification({
				message: t('password_too_short'),
				type: 'error'
			});
			return;
		}

		try {
			const result = await resetPassword({
				token: resetToken,
				email: email,
				new_password: newPassword
			});

			if (result.success) {
				setNotification({
					message: result.message || t('password_reset_successful'),
					type: 'success'
				});

				// Redirect to login after 2 seconds
				setTimeout(() => {
					navigate('/login');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to reset password');
			}
		} catch (error) {
			console.error('Password reset error:', error);
			setNotification({
				message: error.message || t('password_reset_error'),
				type: 'error'
			});
		}
	};

	if (loading) {
		return <LoadingSpinner fullScreen text={t('processing')} />;
	}

	return (
		<div className="auth-page">
			<LanguageToggle />

			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="auth-container">
				<div className="auth-header">
					<h1>{organizationName}</h1>
					<h2>{isRequestMode ? t('reset_password') : t('set_new_password')}</h2>
				</div>

				{isRequestMode ? (
					// Request password reset form
					<form onSubmit={handleRequestReset} className="auth-form">
						<div className="form-group">
							<label htmlFor="email">{t('email')}</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								placeholder={t('enter_your_email')}
							/>
						</div>

						<button type="submit" className="auth-button" disabled={loading}>
							{loading ? t('sending') : t('send_reset_link')}
						</button>

						<div className="auth-links">
							<Link to="/login">{t('back_to_login')}</Link>
							<Link to="/register">{t('create_account')}</Link>
						</div>
					</form>
				) : (
					// Set new password form
					<form onSubmit={handlePasswordReset} className="auth-form">
						<div className="form-group">
							<label htmlFor="email">{t('email')}</label>
							<input
								type="email"
								id="email"
								value={email}
								disabled
								className="disabled-input"
							/>
						</div>

						<div className="form-group">
							<label htmlFor="newPassword">{t('new_password')}</label>
							<input
								type="password"
								id="newPassword"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								autoComplete="new-password"
								placeholder={t('enter_new_password')}
								minLength={6}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="confirmPassword">{t('confirm_password')}</label>
							<input
								type="password"
								id="confirmPassword"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								autoComplete="new-password"
								placeholder={t('confirm_new_password')}
								minLength={6}
							/>
						</div>

						<button type="submit" className="auth-button" disabled={loading}>
							{loading ? t('updating') : t('update_password')}
						</button>

						<div className="auth-links">
							<Link to="/login">{t('back_to_login')}</Link>
						</div>
					</form>
				)}

				<div className="auth-footer">
					<p>{t('password_requirements')}</p>
				</div>
			</div>
		</div>
	);
};

export default ResetPassword;