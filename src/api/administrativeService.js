// src/api/administrativeService.js
/**
 * Service for administrative operations (users, organizations, settings)
 * Priority: HIGH - Required for admin functionality
 */

import { fetchFromApi, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

/**
 * User Management
 */

export async function getUsers(organizationId = null) {
	try {
		const params = organizationId ? { organization_id: organizationId } : {};
		const response = await fetchFromApi('get_users', 'GET', null, params);

		if (response.success) {
			debugLog('Users fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch users');
	} catch (error) {
		debugError('Error fetching users:', error);
		throw error;
	}
}

export async function updateUserRole(userId, newRole, organizationId = null) {
	try {
		const data = {
			user_id: userId,
			role: newRole
		};
		if (organizationId) {
			data.organization_id = organizationId;
		}

		const response = await fetchFromApi('update_user_role', 'POST', data);

		if (response.success) {
			debugLog(`User ${userId} role updated to ${newRole}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update user role');
	} catch (error) {
		debugError(`Error updating user role for ${userId}:`, error);
		throw error;
	}
}

export async function approveUser(userId, organizationId = null) {
	try {
		const data = { user_id: userId };
		if (organizationId) {
			data.organization_id = organizationId;
		}

		const response = await fetchFromApi('approve_user', 'POST', data);

		if (response.success) {
			debugLog(`User ${userId} approved successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to approve user');
	} catch (error) {
		debugError(`Error approving user ${userId}:`, error);
		throw error;
	}
}

export async function getSubscribers(organizationId = null) {
	try {
		const params = organizationId ? { organization_id: organizationId } : {};
		const response = await fetchFromApi('get_subscribers', 'GET', null, params);

		if (response.success) {
			debugLog('Subscribers fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch subscribers');
	} catch (error) {
		debugError('Error fetching subscribers:', error);
		throw error;
	}
}

/**
 * Organization Management
 */

export async function getOrganizationSettings(orgId = null) {
	const cacheKey = `org_settings_${orgId || 'current'}`;
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached organization settings');
		return cachedData;
	}

	try {
		const params = orgId ? { organization_id: orgId } : {};
		const response = await fetchFromApi('get_organization_settings', 'GET', null, params);

		if (response.success || response.organization_info) {
			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, response, 10 * 60 * 1000);
			debugLog('Organization settings fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch organization settings');
	} catch (error) {
		debugError('Error fetching organization settings:', error);

		// Return cached data even if expired when offline
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { ...expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

export async function fetchOrganizationId() {
	try {
		const response = await fetchFromApi('fetch_organization_id', 'GET');

		if (response.success && response.organizationId) {
			// Cache the organization ID
			localStorage.setItem('currentOrganizationId', response.organizationId);
			debugLog('Organization ID fetched:', response.organizationId);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch organization ID');
	} catch (error) {
		debugError('Error fetching organization ID:', error);
		throw error;
	}
}

export async function registerForOrganization(registrationData) {
	try {
		const response = await fetchFromApi('register_organization', 'POST', registrationData);

		if (response.success) {
			debugLog('Organization registration successful');
			return response;
		}

		throw new Error(response.message || 'Failed to register organization');
	} catch (error) {
		debugError('Error registering organization:', error);
		throw error;
	}
}

/**
 * Notification Management
 */

export async function sendNotification(title, body, subscriberIds = []) {
	try {
		const data = {
			title,
			body,
			subscribers: subscriberIds
		};

		const response = await fetchFromApi('send_notification', 'POST', data);

		if (response.success) {
			debugLog('Notification sent successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to send notification');
	} catch (error) {
		debugError('Error sending notification:', error);
		throw error;
	}
}

/**
 * Mailing List Management
 */

export async function getMailingList() {
	const cacheKey = 'mailing_list';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached mailing list');
		return { success: true, mailingList: cachedData };
	}

	try {
		const response = await fetchFromApi('get_mailing_list', 'GET');

		if (response.success && response.mailingList) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.mailingList, 5 * 60 * 1000);
			debugLog('Mailing list fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch mailing list');
	} catch (error) {
		debugError('Error fetching mailing list:', error);
		throw error;
	}
}

/**
 * Parent Contact Management
 */

export async function getParentContactList() {
	const cacheKey = 'parent_contact_list';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached parent contact list');
		return { success: true, contacts: cachedData };
	}

	try {
		const response = await fetchFromApi('get_parent_contact_list', 'GET');

		if (response.success && response.contacts) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.contacts, 5 * 60 * 1000);
			debugLog('Parent contact list fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch parent contact list');
	} catch (error) {
		debugError('Error fetching parent contact list:', error);
		throw error;
	}
}

/**
 * User-Participant Association Management
 */

export async function getParticipantsWithUsers() {
	try {
		const response = await fetchFromApi('get_participants_with_users', 'GET');

		if (response.success) {
			debugLog('Participants with users fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participants with users');
	} catch (error) {
		debugError('Error fetching participants with users:', error);
		throw error;
	}
}

export async function getParentUsers() {
	try {
		const response = await fetchFromApi('get_parent_users', 'GET');

		if (response.success) {
			debugLog('Parent users fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch parent users');
	} catch (error) {
		debugError('Error fetching parent users:', error);
		throw error;
	}
}

export async function associateUser(participantId, userId) {
	try {
		const data = {
			participant_id: participantId,
			user_id: userId
		};

		const response = await fetchFromApi('associate_user', 'POST', data);

		if (response.success) {
			debugLog(`User ${userId} associated with participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to associate user with participant');
	} catch (error) {
		debugError(`Error associating user ${userId} with participant ${participantId}:`, error);
		throw error;
	}
}

export const administrativeService = {
	getUsers,
	updateUserRole,
	approveUser,
	getSubscribers,
	getOrganizationSettings,
	fetchOrganizationId,
	registerForOrganization,
	sendNotification,
	getMailingList,
	getParentContactList,
	getParticipantsWithUsers,
	getParentUsers,
	associateUser
};

export default administrativeService;