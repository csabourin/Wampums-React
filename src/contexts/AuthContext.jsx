// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../api/authService';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Initialize authentication state
	useEffect(() => {
		const user = authService.getCurrentUser();
		setCurrentUser(user);
		setLoading(false);
	}, []);

	// Login function - now accepts organizationId parameter
	const login = async (email, password, organizationId = null) => {
		setLoading(true);
		setError(null);

		try {
			const result = await authService.login(email, password, organizationId);
			if (result.success) {
				setCurrentUser(result.user);
				return { success: true };
			} else {
				setError(result.message);
				return { success: false, message: result.message };
			}
		} catch (error) {
			const errorMessage = error.message || 'Login failed';
			setError(errorMessage);
			return { success: false, message: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Logout function
	const logout = async () => {
		setLoading(true);
		setError(null); // Clear any previous errors

		try {
			await authService.logout();
			setCurrentUser(null);
		} catch (error) {
			console.error('Logout error:', error);
			setError(error.message);
			// Even if logout fails on server, clear local state
			setCurrentUser(null);
		} finally {
			setLoading(false);
		}
	};

	// Register function
	const register = async (userData) => {
		setLoading(true);
		setError(null);

		try {
			const result = await authService.register(userData);
			return result;
		} catch (error) {
			const errorMessage = error.message || 'Registration failed';
			setError(errorMessage);
			return { success: false, message: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Reset password function
	const resetPassword = async (token, newPassword) => {
		setLoading(true);
		setError(null);

		try {
			const result = await authService.resetPassword(token, newPassword);
			return result;
		} catch (error) {
			const errorMessage = error.message || 'Password reset failed';
			setError(errorMessage);
			return { success: false, message: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Request password reset
	const requestPasswordReset = async (email) => {
		setLoading(true);
		setError(null);

		try {
			const result = await authService.requestPasswordReset(email);
			return result;
		} catch (error) {
			const errorMessage = error.message || 'Password reset request failed';
			setError(errorMessage);
			return { success: false, message: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Clear error function - useful for dismissing error notifications
	const clearError = () => {
		setError(null);
	};

	// The auth context value
	const value = {
		currentUser,
		loading,
		error,
		isAuthenticated: !!currentUser,
		login,
		logout,
		register,
		resetPassword,
		requestPasswordReset,
		clearError
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthContext;