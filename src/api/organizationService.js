// src/api/organizationService.js
import apiService from "./apiService";
import indexedDBService from "../lib/indexedDBService";

const ORGANIZATION_ID_KEY = "currentOrganizationId";
const SETTINGS_CACHE_KEY = "organization_settings";
const API_BASE_URL =
	import.meta.env.REACT_APP_API_URL || "https://wampums-api.replit.app";

export const organizationService = {
	fetchOrganizationId,
	getOrganizationSettings,
	getOrganizationFormFormats,
	setCurrentOrganizationId,
	getCurrentOrganizationId,
};

/**
 * Fetch organization ID based on hostname
 */
async function fetchOrganizationId() {
	// Check if the organization ID is already in localStorage
	const storedId = localStorage.getItem(ORGANIZATION_ID_KEY);
	if (storedId) {
		console.log("Using stored organization ID from localStorage:", storedId);
		return parseInt(storedId, 10);
	}

	// If not found in localStorage, fetch from the server
	try {
		console.log("Fetching organization ID from the server...");

		// Get the current hostname
		// const hostname = window.location.hostname;
		const hostname = "https://meute6a.app";
		// Removed hardcoded organizationId and malformed hostname

		const response = await fetch(
			`${API_BASE_URL}/get_organization_id?hostname=${encodeURIComponent(hostname)}`
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Check for the organizationId in the response structure
		const organizationId = data.data?.organizationId || data.organizationId;

		if (data.success && organizationId) {
			// Store the organization ID in localStorage for future use
			localStorage.setItem(ORGANIZATION_ID_KEY, organizationId.toString());
			console.log("Organization ID fetched and stored:", organizationId);
			return parseInt(organizationId, 10);
		} else {
			throw new Error("Failed to fetch organization ID from the server");
		}
	} catch (error) {
		console.error("Error fetching organization ID:", error);
		throw error;
	}
}

/**
 * Get organization settings with caching
 */
async function getOrganizationSettings() {
	const cacheKey = SETTINGS_CACHE_KEY;
	const expirationTime = 60 * 60 * 1000; // Cache expires after 60 minutes

	// Try to get cached data from IndexedDB
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		console.log("Using cached organization settings");
		return cachedData;
	}

	// Fetch from API if no valid cached data is found
	try {
		const organizationId = await fetchOrganizationId(); // Added await
		const response = await fetch(
			`${API_BASE_URL}/public/organization-settings`,
			{
				headers: {
					"X-Organization-ID": organizationId.toString(), // Convert to string
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const responseData = await response.json();

		// Normalize the settings
		const settings = responseData.data ? responseData.data : responseData;

		// Save the normalized settings to IndexedDB for future use
		await indexedDBService.setCachedData(cacheKey, settings, expirationTime);

		console.log("Fresh organization settings fetched");
		return settings;
	} catch (error) {
		console.error("Error fetching organization settings:", error);
		throw error;
	}
}

/**
 * Get organization form formats
 */
async function getOrganizationFormFormats(organizationId = null) {
	const currentOrgId = organizationId || getCurrentOrganizationId();
	const cacheKey = `form_formats_${currentOrgId}`;
	const expirationTime = 24 * 60 * 60 * 1000; // Cache for 24 hours

	// Try to get cached data
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		console.log("Using cached form formats");
		return cachedData;
	}

	try {
		let url = `${API_BASE_URL}/get_organization_form_formats`;
		if (organizationId) {
			url += `?organization_id=${organizationId}`;
		}

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
				"Content-Type": "application/json",
				"X-Organization-ID": (organizationId || getCurrentOrganizationId()).toString(),
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (data.success) {
			// Cache the form formats
			await indexedDBService.setCachedData(
				cacheKey,
				data.formFormats,
				expirationTime,
			);
			return data.formFormats;
		} else {
			throw new Error(
				data.message || "Failed to fetch organization form formats",
			);
		}
	} catch (error) {
		console.error("Error fetching organization form formats:", error);
		throw error;
	}
}

/**
 * Set the current organization ID
 */
function setCurrentOrganizationId(organizationId) {
	localStorage.setItem(ORGANIZATION_ID_KEY, organizationId.toString());
}

/**
 * Get the current organization ID
 */
function getCurrentOrganizationId() {
	const id = localStorage.getItem(ORGANIZATION_ID_KEY);
	return id ? parseInt(id, 10) : null; // Return null if no ID exists
}

export default organizationService;