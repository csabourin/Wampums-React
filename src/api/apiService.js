// src/api/apiService.js
import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.REACT_APP_API_URL || '';
const DEBUG_MODE = import.meta.env.REACT_APP_DEBUG_MODE === 'true';

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
		}

		// Handle authentication errors
		if (error.response && error.response.status === 401) {
			// Session expired or invalid token
			localStorage.removeItem('jwtToken');
			window.location.href = '/login';
		}

		return Promise.reject(error);
	}
);

// Helper function to construct API URLs
export function getApiUrl(action, additionalParams = {}) {
	const url = new URL(`/api.php`, API_URL);
	url.searchParams.append('action', action);

	const organizationId = authService.getOrganizationId();
	if (organizationId) {
		url.searchParams.append('organization_id', organizationId);
	}

	// Add additional params
	Object.entries(additionalParams).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			url.searchParams.append(key, value);
		}
	});

	return url.toString();
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

// Fetch from API helper
export async function fetchFromApi(action, method = 'GET', data = null, params = {}) {
	try {
		const url = getApiUrl(action, params);
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

// Upload to API helper
export async function uploadToApi(action, formData, progressCallback = null) {
	try {
		const url = getApiUrl(action);
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
	get: async (action, params = {}) => {
		try {
			const url = getApiUrl(action, params);
			const response = await apiClient.get(url);
			return response.data;
		} catch (error) {
			console.error(`Error fetching ${action}:`, error);
			throw error;
		}
	},

	post: async (action, data = {}, params = {}) => {
		try {
			const url = getApiUrl(action, params);
			const response = await apiClient.post(url, data);
			return response.data;
		} catch (error) {
			console.error(`Error posting to ${action}:`, error);
			throw error;
		}
	},

	put: async (action, data = {}, params = {}) => {
		try {
			const url = getApiUrl(action, params);
			const response = await apiClient.put(url, data);
			return response.data;
		} catch (error) {
			console.error(`Error putting to ${action}:`, error);
			throw error;
		}
	},

	delete: async (action, params = {}) => {
		try {
			const url = getApiUrl(action, params);
			const response = await apiClient.delete(url);
			return response.data;
		} catch (error) {
			console.error(`Error deleting from ${action}:`, error);
			throw error;
		}
	}
};

export default apiService;