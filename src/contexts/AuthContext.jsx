// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../api/authService';

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

	// Login function
	const login = async (email, password) => {
		setLoading(true);
		setError(null);
		try {
			const result = await authService.login(email, password);
			if (result.success) {
				setCurrentUser(result.user);
				return { success: true };
			} else {
				setError(result.message);
				return { success: false, message: result.message };
			}
		} catch (error) {
			setError(error.message);
			return { success: false, message: error.message };
		} finally {
			setLoading(false);
		}
	};

	// Logout function
	const logout = async () => {
		setLoading(true);
		try {
			await authService.logout();
			setCurrentUser(null);
		} catch (error) {
			setError(error.message);
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
			setError(error.message);
			return { success: false, message: error.message };
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
			setError(error.message);
			return { success: false, message: error.message };
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
			setError(error.message);
			return { success: false, message: error.message };
		} finally {
			setLoading(false);
		}
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
		requestPasswordReset
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthContext;