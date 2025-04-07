// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import LanguageToggle from '../components/common/LanguageToggle/LanguageToggle';
import { organizationService } from '../api/organizationService';
import './Login.css';

const Login = () => {
	const { t } = useTranslation();
	const { login, loading, error } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [organizationName, setOrganizationName] = useState('Scouts');
	const [notification, setNotification] = useState({ message: '', type: '' });

	useEffect(() => {
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
	}, []);

	// Set notification if there's an error from the auth context
	useEffect(() => {
		if (error) {
			setNotification({
				message: error,
				type: 'error'
			});
		}
	}, [error]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const result = await login(email, password);

			if (!result.success) {
				setNotification({
					message: result.message || t('login_failed'),
					type: 'error'
				});
			}
			// Successful login will trigger a redirect from the protected route
		} catch (err) {
			setNotification({
				message: err.message || t('login_failed'),
				type: 'error'
			});
		}
	};

	return (
		<div className="login-container">
			<LanguageToggle />

			<div className="login-form-container">
				<h1>{t('login')}</h1>
				<h2>{organizationName}</h2>

				{notification.message && (
					<Notification 
						message={notification.message}
						type={notification.type}
						onClose={() => setNotification({ message: '', type: '' })}
					/>
				)}

				<form className="login-form" onSubmit={handleSubmit}>
					<div className="form-group">
						<input
							type="email"
							name="email"
							placeholder={t('email')}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<input
							type="password"
							name="password"
							placeholder={t('password')}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
						/>
					</div>

					<button type="submit" className="btn-primary" disabled={loading}>
						{loading ? <LoadingSpinner /> : t('submit_login')}
					</button>
				</form>

				<div className="login-links">
					<p>
						<Link to="/register">{t('create_account')}</Link>
					</p>
					<p>
						<Link to="/reset-password">{t('forgot_password')}</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Login;