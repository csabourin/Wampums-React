// src/api/apiService.js
import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.REACT_APP_API_URL || 'https://wampums-api.replit.app';
const DEBUG_MODE = import.meta.env.REACT_APP_DEBUG_MODE === 'true' || import.meta.env.DEV;

// Create axios instance
const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json'
	}
});

// Add a request interceptor
apiClient.interceptors.request.use(
	config => {
		// Add auth headers to every request
		const headers = authService.getAuthHeaders();
		config.headers = {
			...config.headers,
			...headers
		};

		if (DEBUG_MODE) {
			console.log('API Request:', config);
		}

		return config;
	},
	error => {
		if (DEBUG_MODE) {
			console.error('API Request Error:', error);
		}
		return Promise.reject(error);
	}
);

// Add a response interceptor
apiClient.interceptors.response.use(
	response => {
		if (DEBUG_MODE) {
			console.log('API Response:', response);
		}
		return response;
	},
	error => {
		if (DEBUG_MODE) {
			console.error('API Response Error:', error);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
				console.error('Response headers:', error.response.headers);
			}
		}

		// Handle authentication errors
		if (error.response && (error.response.status === 401 || error.response.status === 403)) {
			console.error('Authentication/Authorization error:', error.response.status, error.response.data);
			if (error.response.status === 401) {
				// Session expired or invalid token
				localStorage.removeItem('jwtToken');
				window.location.href = '/login';
			}
		}

		return Promise.reject(error);
	}
);

// Helper function to construct API URLs for public endpoints
export function getPublicApiUrl(endpoint) {
	if (!API_URL) {
		throw new Error('API_URL is not configured. Please set REACT_APP_API_URL environment variable.');
	}
	return `${API_URL}/public/${endpoint}`;
}

// Helper function to construct API URLs for authenticated endpoints
export function getApiUrl(endpoint) {
	if (!API_URL) {
		throw new Error('API_URL is not configured. Please set REACT_APP_API_URL environment variable.');
	}
	return `${API_URL}/api/${endpoint}`;
}

// Debug functions
export function debugLog(...args) {
	if (DEBUG_MODE) {
		console.log(...args);
	}
}

export function debugError(...args) {
	if (DEBUG_MODE) {
		console.error(...args);
	}
}

// Auth header helper
export function getAuthHeader() {
	return authService.getAuthHeaders();
}

// Fetch from API helper for authenticated endpoints
export async function fetchFromApi(endpoint, method = 'GET', data = null) {
	try {
		const url = getApiUrl(endpoint);
		const config = {
			method,
			headers: authService.getAuthHeaders()
		};
		
		if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
			config.data = data;
		}
		
		const response = await apiClient.request(config.method === 'GET' ? {
			url,
			method: 'GET',
			headers: config.headers
		} : {
			url,
			method: config.method,
			headers: config.headers,
			data: config.data
		});
		
		return response.data;
	} catch (error) {
		if (!navigator.onLine) {
			error.isOffline = true;
		}
		throw error;
	}
}

// Fetch from public API helper (no authentication)
export async function fetchFromPublicApi(endpoint, method = 'GET', data = null) {
	try {
		const url = getPublicApiUrl(endpoint);
		const config = {
			method,
			headers: { 'Content-Type': 'application/json' }
		};

		// Add organization ID to headers if available
		try {
			const organizationId = authService.getOrganizationId();
			if (organizationId) {
				config.headers['x-organization-id'] = organizationId;
			}
		} catch (error) {
			// AuthService might not be initialized yet, skip organization ID
			debugLog('AuthService not ready, skipping organization ID');
		}
		
		if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
			config.data = data;
		}
		
		const response = await apiClient.request({
			url,
			method: config.method,
			headers: config.headers,
			...(config.data && { data: config.data })
		});
		
		return response.data;
	} catch (error) {
		if (!navigator.onLine) {
			error.isOffline = true;
		}
		throw error;
	}
}

// Upload to API helper
export async function uploadToApi(endpoint, formData, progressCallback = null) {
	try {
		const url = getApiUrl(endpoint);
		const response = await apiClient.post(url, formData, {
			headers: {
				...authService.getAuthHeaders(),
				'Content-Type': 'multipart/form-data'
			},
			onUploadProgress: progressCallback ? (progressEvent) => {
				const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
				progressCallback(percentCompleted);
			} : undefined
		});
		return response.data;
	} catch (error) {
		if (!navigator.onLine) {
			error.isOffline = true;
		}
		throw error;
	}
}

// General API functions
export const apiService = {
	get: async (endpoint) => {
		try {
			return await fetchFromApi(endpoint, 'GET');
		} catch (error) {
			console.error(`Error fetching ${endpoint}:`, error);
			throw error;
		}
	},

	post: async (endpoint, data = {}) => {
		try {
			return await fetchFromApi(endpoint, 'POST', data);
		} catch (error) {
			console.error(`Error posting to ${endpoint}:`, error);
			throw error;
		}
	},

	put: async (endpoint, data = {}) => {
		try {
			return await fetchFromApi(endpoint, 'PUT', data);
		} catch (error) {
			console.error(`Error putting to ${endpoint}:`, error);
			throw error;
		}
	},

	delete: async (endpoint) => {
		try {
			return await fetchFromApi(endpoint, 'DELETE');
		} catch (error) {
			console.error(`Error deleting from ${endpoint}:`, error);
			throw error;
		}
	}
};

// Public API functions (no authentication required)
export const publicApiService = {
	get: async (endpoint) => {
		try {
			return await fetchFromPublicApi(endpoint, 'GET');
		} catch (error) {
			console.error(`Error fetching public ${endpoint}:`, error);
			throw error;
		}
	},

	post: async (endpoint, data = {}) => {
		try {
			return await fetchFromPublicApi(endpoint, 'POST', data);
		} catch (error) {
			console.error(`Error posting to public ${endpoint}:`, error);
			throw error;
		}
	}
};

export default apiService;