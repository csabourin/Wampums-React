// src/api/authService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'https://wampums-api.replit.app';
const AUTH_TOKEN_KEY = 'jwtToken';
const USER_ROLE_KEY = 'userRole';
const USER_FULLNAME_KEY = 'userFullName';
const USER_ID_KEY = 'userId';
const ORGANIZATION_ID_KEY = 'currentOrganizationId';

export const authService = {
	login,
	logout,
	register,
	resetPassword,
	requestPasswordReset,
	getCurrentUser,
	isAuthenticated,
	getAuthHeaders,
	getToken,
	getOrganizationId,
	decodeJwt
};

export default authService;

async function login(email, password) {
	try {
		// First, ensure we have the organization ID
		const { organizationService } = await import('./organizationService');
		const organizationId = await organizationService.fetchOrganizationId();

		if (!organizationId) {
			throw new Error('Unable to determine organization');
		}

		const response = await axios.post(`${API_URL}/public/login`, {
			email,
			password
		}, {
			headers: {
				'X-Organization-ID': organizationId.toString()
			}
		});

		const { success, token, user_role, user_full_name, user_id, message } = response.data;

		if (success && token) {
			// Store auth data AND organization ID
			localStorage.setItem(AUTH_TOKEN_KEY, token);
			localStorage.setItem(USER_ROLE_KEY, user_role || '');
			localStorage.setItem(USER_FULLNAME_KEY, user_full_name || '');
			localStorage.setItem(USER_ID_KEY, user_id?.toString() || '');
			localStorage.setItem(ORGANIZATION_ID_KEY, organizationId.toString()); // Store org ID

			return {
				success: true,
				user: {
					role: user_role,
					fullName: user_full_name,
					id: user_id
				}
			};
		}
		return { success: false, message };
	} catch (error) {
		console.error('Login error:', error);
		return {
			success: false,
			message: error.response?.data?.message || error.message || 'Error during login'
		};
	}
}

async function logout() {
	try {
		// Use consistent endpoint pattern - should match other endpoints
		await axios.post(`${API_URL}/logout`, {}, {
			headers: getAuthHeaders()
		});
	} catch (error) {
		console.warn('Error during server logout:', error);
		// Continue with client-side logout even if server logout fails
	}

	// Clear user data from localStorage
	localStorage.removeItem(AUTH_TOKEN_KEY);
	localStorage.removeItem(USER_ROLE_KEY);
	localStorage.removeItem(USER_FULLNAME_KEY);
	localStorage.removeItem(USER_ID_KEY);
	localStorage.removeItem(ORGANIZATION_ID_KEY); // Also clear organization ID on logout
	localStorage.removeItem('guardianParticipants');

	// Redirect to login page
	window.location.href = '/login';
	return { success: true };
}

async function register(registerData) {
	try {
		// Ensure we have organization ID for registration
		const { organizationService } = await import('./organizationService');
		const organizationId = await organizationService.fetchOrganizationId();

		if (!organizationId) {
			throw new Error('Unable to determine organization');
		}

		// Use consistent endpoint pattern
		const response = await axios.post(`${API_URL}/public/register`, registerData, {
			headers: {
				'X-Organization-ID': organizationId.toString()
			}
		});
		return response.data;
	} catch (error) {
		console.error('Registration error:', error);
		return {
			success: false,
			message: error.response?.data?.message || error.message || 'Error during registration'
		};
	}
}

async function resetPassword(token, newPassword) {
	try {
		// Use consistent endpoint pattern
		const response = await axios.post(`${API_URL}/public/reset-password`, {
			token,
			new_password: newPassword
		});
		return response.data;
	} catch (error) {
		console.error('Password reset error:', error);
		return {
			success: false,
			message: error.response?.data?.message || 'Error resetting password'
		};
	}
}

async function requestPasswordReset(email) {
	try {
		// Use consistent endpoint pattern
		const response = await axios.post(`${API_URL}/public/request-password-reset`, {
			email
		});
		return response.data;
	} catch (error) {
		console.error('Password reset request error:', error);
		return {
			success: false,
			message: error.response?.data?.message || 'Error requesting password reset'
		};
	}
}

function getCurrentUser() {
	const token = localStorage.getItem(AUTH_TOKEN_KEY);
	const userRole = localStorage.getItem(USER_ROLE_KEY);
	const userFullName = localStorage.getItem(USER_FULLNAME_KEY);
	const userId = localStorage.getItem(USER_ID_KEY);

	if (!token || !userId) {
		return null;
	}

	return {
		role: userRole,
		fullName: userFullName,
		id: parseInt(userId, 10) || userId // Convert to number if possible
	};
}

function isAuthenticated() {
	const token = getToken();

	if (!token) {
		return false;
	}

	// Check if token is expired
	const decoded = decodeJwt(token);
	if (decoded && decoded.exp) {
		const currentTime = Math.floor(Date.now() / 1000);
		if (decoded.exp < currentTime) {
			// Token is expired, clear it
			logout();
			return false;
		}
	}

	const user = getCurrentUser();
	return Boolean(user);
}

function getAuthHeaders() {
	const token = localStorage.getItem(AUTH_TOKEN_KEY);
	const organizationId = localStorage.getItem(ORGANIZATION_ID_KEY);

	const headers = {};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	if (organizationId) {
		headers['x-organization-id'] = organizationId;
	}

	return headers;
}

function getToken() {
	return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getOrganizationId() {
	const id = localStorage.getItem(ORGANIZATION_ID_KEY);
	return id ? parseInt(id, 10) : null; // Return null if no ID exists, parse as int
}

function decodeJwt(token) {
	try {
		if (!token) return null;

		// Split the JWT into parts
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		// Decode the payload (middle part)
		const base64Url = parts[1];
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

		// Add padding if needed
		const padding = base64.length % 4;
		const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;

		const jsonPayload = decodeURIComponent(
			atob(paddedBase64)
				.split('')
				.map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);

		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error('Error decoding JWT:', error);
		return null;
	}
}