// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import LanguageToggle from '../components/common/LanguageToggle/LanguageToggle';
import './Register.css';

const Register = () => {
	const { t } = useTranslation();
	const { register, loading } = useAuth();
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		full_name: '',
		email: '',
		password: '',
		confirm_password: '',
		account_creation_password: '',
		user_type: 'parent'
	});

	const [notification, setNotification] = useState({ message: '', type: '' });

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate passwords match
		if (formData.password !== formData.confirm_password) {
			setNotification({
				message: t('passwords_do_not_match'),
				type: 'error'
			});
			return;
		}

		try {
			const result = await register(formData);

			if (result.success) {
				setNotification({
					message: result.message || t('account_created_successfully'),
					type: 'success'
				});

				// Redirect to login after successful registration
				setTimeout(() => {
					navigate('/login');
				}, 3000);
			} else {
				setNotification({
					message: result.message || t('error_creating_account'),
					type: 'error'
				});
			}
		} catch (error) {
			console.error('Registration error:', error);
			setNotification({
				message: error.message || t('error_creating_account'),
				type: 'error'
			});
		}
	};

	return (
		<div className="register-container">
			<LanguageToggle />

			<div className="register-form-container">
				<h1>{t('register')}</h1>

				{notification.message && (
					<Notification 
						message={notification.message}
						type={notification.type}
						onClose={() => setNotification({ message: '', type: '' })}
					/>
				)}

				<form className="register-form" onSubmit={handleSubmit}>
					<div className="form-group">
						<label htmlFor="full_name">{t('full_name')}:</label>
						<input
							type="text"
							id="full_name"
							name="full_name"
							value={formData.full_name}
							onChange={handleChange}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="email">{t('email')}:</label>
						<input
							type="email"
							id="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="password">{t('password')}:</label>
						<input
							type="password"
							id="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="confirm_password">{t('confirm_password')}:</label>
						<input
							type="password"
							id="confirm_password"
							name="confirm_password"
							value={formData.confirm_password}
							onChange={handleChange}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="account_creation_password">{t('account_creation_password')}:</label>
						<input
							type="password"
							id="account_creation_password"
							name="account_creation_password"
							value={formData.account_creation_password}
							onChange={handleChange}
							required
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="user_type">{t('user_type')}:</label>
						<select
							id="user_type"
							name="user_type"
							value={formData.user_type}
							onChange={handleChange}
							required
							disabled={loading}
						>
							<option value="parent">{t('parent')}</option>
							<option value="animation">{t('animation')}</option>
						</select>
					</div>

					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? <LoadingSpinner /> : t('register')}
					</button>
				</form>

				<p className="login-link">
					<Link to="/login">{t('already_have_account')}</Link>
				</p>
			</div>
		</div>
	);
};

export default Register;