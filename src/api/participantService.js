// src/api/participantService.js
/**
 * Service for managing participant operations
 * Priority: CRITICAL - Required for most app functionality
 */

import { fetchFromApi, uploadToApi, getAuthHeader, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

const PARTICIPANTS_CACHE_KEY = 'participants_list';
const PARTICIPANT_CACHE_PREFIX = 'participant_';

/**
 * Get all participants with optional filtering
 */
export async function getParticipants(filters = {}) {
	const cacheKey = `${PARTICIPANTS_CACHE_KEY}_${JSON.stringify(filters)}`;

	// Try cache first (5 minute expiration for participant lists)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached participants data');
		return { success: true, participants: cachedData };
	}

	try {
		const params = {};
		if (filters.groupId) params.group_id = filters.groupId;
		if (filters.active !== undefined) params.active = filters.active;
		if (filters.search) params.search = filters.search;

		const response = await fetchFromApi('participants', 'GET');

		if (response.success && response.participants) {
			// Cache the results for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.participants, 5 * 60 * 1000);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participants');
	} catch (error) {
		debugError('Error fetching participants:', error);

		// If offline, try to return cached data even if expired
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { success: true, participants: expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

/**
 * Get participants for the current parent user
 */
export async function fetchParticipantsForParent() {
	const cacheKey = 'parent_participants';

	// Try cache first (2 minute expiration for parent-specific data)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached parent participants data');
		return cachedData;
	}

	try {
		const response = await fetchFromApi('get_user_participants');

		if (response.success && response.participants) {
			// Cache for 2 minutes
			await indexedDBService.setCachedData(cacheKey, response.participants, 2 * 60 * 1000);
			return response.participants;
		}

		throw new Error(response.message || 'Failed to fetch parent participants');
	} catch (error) {
		debugError('Error fetching parent participants:', error);

		// Return empty array if offline and no cache
		if (error.isOffline) {
			return [];
		}

		throw error;
	}
}

/**
 * Get a single participant by ID
 */
export async function getParticipant(participantId) {
	const cacheKey = `${PARTICIPANT_CACHE_PREFIX}${participantId}`;

	// Try cache first (10 minute expiration for individual participants)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached participant data for ID: ${participantId}`);
		return { success: true, participant: cachedData };
	}

	try {
		const response = await fetchFromApi('get_participant', 'GET', null, { participant_id: participantId });

		if (response.success && response.participant) {
			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, response.participant, 10 * 60 * 1000);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participant');
	} catch (error) {
		debugError(`Error fetching participant ${participantId}:`, error);
		throw error;
	}
}

/**
 * Create a new participant
 */
export async function createParticipant(participantData) {
	try {
		const response = await fetchFromApi('create_participant', 'POST', participantData);

		if (response.success) {
			// Clear relevant caches
			await clearParticipantCaches();

			debugLog('Participant created successfully:', response.participant_id);
			return response;
		}

		throw new Error(response.message || 'Failed to create participant');
	} catch (error) {
		debugError('Error creating participant:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('createParticipant', participantData, 2);
			return {
				success: true,
				offline: true,
				message: 'Participant will be created when online',
				tempId: `temp_${Date.now()}`
			};
		}

		throw error;
	}
}

/**
 * Update an existing participant
 */
export async function updateParticipant(participantId, participantData) {
	try {
		const data = { participant_id: participantId, ...participantData };
		const response = await fetchFromApi('update_participant', 'POST', data);

		if (response.success) {
			// Clear relevant caches
			await clearParticipantCaches();
			await indexedDBService.clearCachedData(`${PARTICIPANT_CACHE_PREFIX}${participantId}`);

			debugLog(`Participant ${participantId} updated successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to update participant');
	} catch (error) {
		debugError(`Error updating participant ${participantId}:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateParticipant', { participantId, ...participantData }, 2);
			return {
				success: true,
				offline: true,
				message: 'Participant changes will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Delete a participant
 */
export async function deleteParticipant(participantId) {
	try {
		const response = await fetchFromApi('delete_participant', 'POST', { participant_id: participantId });

		if (response.success) {
			// Clear relevant caches
			await clearParticipantCaches();
			await indexedDBService.clearCachedData(`${PARTICIPANT_CACHE_PREFIX}${participantId}`);

			debugLog(`Participant ${participantId} deleted successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to delete participant');
	} catch (error) {
		debugError(`Error deleting participant ${participantId}:`, error);

		// Cannot delete offline - this must be done online
		if (error.isOffline) {
			throw new Error('Cannot delete participant while offline');
		}

		throw error;
	}
}

/**
 * Link participants to the current user (for parents)
 */
export async function linkUserParticipants(participantIds) {
	try {
		const response = await fetchFromApi('link_user_participants', 'POST', { participant_ids: participantIds });

		if (response.success) {
			// Clear parent participants cache
			await indexedDBService.clearCachedData('parent_participants');

			debugLog('Participants linked successfully:', participantIds);
			return response;
		}

		throw new Error(response.message || 'Failed to link participants');
	} catch (error) {
		debugError('Error linking participants:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('linkUserParticipants', { participantIds }, 2);
			return {
				success: true,
				offline: true,
				message: 'Participant links will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Upload participant photo
 */
export async function uploadParticipantPhoto(participantId, photoFile, progressCallback = null) {
	try {
		const formData = new FormData();
		formData.append('participant_id', participantId);
		formData.append('photo', photoFile);

		const response = await uploadToApi('upload_participant_photo', formData, progressCallback);

		if (response.success) {
			// Clear participant cache to refresh photo
			await indexedDBService.clearCachedData(`${PARTICIPANT_CACHE_PREFIX}${participantId}`);

			debugLog(`Photo uploaded successfully for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to upload photo');
	} catch (error) {
		debugError(`Error uploading photo for participant ${participantId}:`, error);

		// Cannot upload files offline
		if (error.isOffline) {
			throw new Error('Cannot upload photos while offline');
		}

		throw error;
	}
}

/**
 * Get participant health form data
 */
export async function getParticipantHealthForm(participantId) {
	try {
		const response = await fetchFromApi('get_participant_health_form', 'GET', null, { participant_id: participantId });

		if (response.success) {
			return response;
		}

		throw new Error(response.message || 'Failed to fetch health form');
	} catch (error) {
		debugError(`Error fetching health form for participant ${participantId}:`, error);
		throw error;
	}
}

/**
 * Save participant health form data
 */
export async function saveParticipantHealthForm(participantId, healthFormData) {
	try {
		const data = { participant_id: participantId, ...healthFormData };
		const response = await fetchFromApi('save_participant_health_form', 'POST', data);

		if (response.success) {
			// Clear participant cache
			await indexedDBService.clearCachedData(`${PARTICIPANT_CACHE_PREFIX}${participantId}`);

			debugLog(`Health form saved for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to save health form');
	} catch (error) {
		debugError(`Error saving health form for participant ${participantId}:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('saveParticipantHealthForm', { participantId, ...healthFormData }, 2);
			return {
				success: true,
				offline: true,
				message: 'Health form will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Get participant badge progress
 */
export async function getParticipantBadgeProgress(participantId) {
	try {
		const response = await fetchFromApi('get_participant_badge_progress', 'GET', null, { participant_id: participantId });

		if (response.success) {
			return response;
		}

		throw new Error(response.message || 'Failed to fetch badge progress');
	} catch (error) {
		debugError(`Error fetching badge progress for participant ${participantId}:`, error);
		throw error;
	}
}

/**
 * Update participant badge progress
 */
export async function updateParticipantBadgeProgress(participantId, badgeData) {
	try {
		const data = { participant_id: participantId, ...badgeData };
		const response = await fetchFromApi('update_participant_badge_progress', 'POST', data);

		if (response.success) {
			debugLog(`Badge progress updated for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update badge progress');
	} catch (error) {
		debugError(`Error updating badge progress for participant ${participantId}:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateParticipantBadgeProgress', { participantId, ...badgeData }, 1);
			return {
				success: true,
				offline: true,
				message: 'Badge progress will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Search participants by name, group, or other criteria
 */
export async function searchParticipants(searchTerm, filters = {}) {
	try {
		const params = { search: searchTerm };
		if (filters.groupId) params.group_id = filters.groupId;
		if (filters.activeOnly) params.active_only = true;

		const response = await fetchFromApi('search_participants', 'GET', null, params);

		if (response.success) {
			return response;
		}

		throw new Error(response.message || 'Failed to search participants');
	} catch (error) {
		debugError('Error searching participants:', error);

		// If offline, try to search in cached participants
		if (error.isOffline) {
			const cachedParticipants = await indexedDBService.getCachedData(PARTICIPANTS_CACHE_KEY);
			if (cachedParticipants) {
				const filteredResults = cachedParticipants.filter(participant => 
					participant.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					participant.last_name.toLowerCase().includes(searchTerm.toLowerCase())
				);
				return { success: true, participants: filteredResults, isOffline: true };
			}
		}

		throw error;
	}
}

/**
 * Get participants by group ID
 */
export async function getParticipantsByGroup(groupId) {
	const cacheKey = `participants_group_${groupId}`;

	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached participants data for group: ${groupId}`);
		return { success: true, participants: cachedData };
	}

	try {
		const response = await fetchFromApi('get_participants_by_group', 'GET', null, { group_id: groupId });

		if (response.success && response.participants) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.participants, 5 * 60 * 1000);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch group participants');
	} catch (error) {
		debugError(`Error fetching participants for group ${groupId}:`, error);
		throw error;
	}
}

/**
 * Clear all participant-related caches
 */
async function clearParticipantCaches() {
	try {
		// Clear main participants list cache
		await indexedDBService.clearCachedData(PARTICIPANTS_CACHE_KEY);

		// Clear parent participants cache
		await indexedDBService.clearCachedData('parent_participants');

		// Clear any group-specific caches (this is not perfect but will work for most cases)
		// In a production app, you might want to track all cache keys more systematically
		for (let i = 1; i <= 20; i++) {
			await indexedDBService.clearCachedData(`participants_group_${i}`);
		}

		debugLog('Participant caches cleared');
	} catch (error) {
		debugError('Error clearing participant caches:', error);
	}
}

/**
 * Sync offline participant data when back online
 */
export async function syncOfflineParticipantData() {
	try {
		const pendingData = await indexedDBService.getPendingOfflineData();
		const participantOperations = pendingData.filter(item => 
			['createParticipant', 'updateParticipant', 'linkUserParticipants', 'saveParticipantHealthForm', 'updateParticipantBadgeProgress'].includes(item.action)
		);

		debugLog(`Syncing ${participantOperations.length} offline participant operations`);

		const results = [];
		for (const operation of participantOperations) {
			try {
				await indexedDBService.updateOfflineDataStatus(operation.id, 'processing');

				let result;
				switch (operation.action) {
					case 'createParticipant':
						result = await createParticipant(operation.data);
						break;
					case 'updateParticipant':
						result = await updateParticipant(operation.data.participantId, operation.data);
						break;
					case 'linkUserParticipants':
						result = await linkUserParticipants(operation.data.participantIds);
						break;
					case 'saveParticipantHealthForm':
						result = await saveParticipantHealthForm(operation.data.participantId, operation.data);
						break;
					case 'updateParticipantBadgeProgress':
						result = await updateParticipantBadgeProgress(operation.data.participantId, operation.data);
						break;
				}

				if (result.success && !result.offline) {
					await indexedDBService.updateOfflineDataStatus(operation.id, 'completed');
					results.push({ operation: operation.action, status: 'success' });
				} else {
					throw new Error(result.message || 'Operation failed');
				}
			} catch (error) {
				debugError(`Error syncing operation ${operation.action}:`, error);
				await indexedDBService.updateOfflineDataStatus(operation.id, 'failed', error);
				results.push({ operation: operation.action, status: 'failed', error: error.message });
			}
		}

		return { success: true, results };
	} catch (error) {
		debugError('Error syncing offline participant data:', error);
		return { success: false, error: error.message };
	}
}

export const participantService = {
	getParticipants,
	fetchParticipantsForParent,
	getParticipant,
	createParticipant,
	updateParticipant,
	deleteParticipant,
	linkUserParticipants,
	uploadParticipantPhoto,
	getParticipantHealthForm,
	saveParticipantHealthForm,
	getParticipantBadgeProgress,
	updateParticipantBadgeProgress,
	searchParticipants,
	getParticipantsByGroup,
	syncOfflineParticipantData
};

export default participantService;