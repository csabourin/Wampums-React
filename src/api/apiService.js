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