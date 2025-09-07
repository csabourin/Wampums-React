// src/api/groupsService.js
/**
 * Service for groups management operations
 * Priority: HIGH - Required for organizing participants
 */

import { fetchFromApi, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

const GROUPS_CACHE_KEY = 'groups_list';

/**
 * Get all groups
 */
export async function getGroups() {
	const cacheKey = GROUPS_CACHE_KEY;
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached groups data');
		return { success: true, groups: cachedData };
	}

	try {
		const response = await fetchFromApi('get_groups', 'GET');

		if (response.success && response.data) {
			// Sort groups alphabetically by name
			const sortedGroups = response.data.sort((a, b) => a.name.localeCompare(b.name));
			console.log("Fetched groups: ", sortedGroups);

			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, sortedGroups, 10 * 60 * 1000);
			debugLog('Groups fetched successfully');
			return { success: true, groups: sortedGroups };
		}

		throw new Error(response.message || 'Failed to fetch groups');
	} catch (error) {
		debugError('Error fetching groups:', error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { success: true, groups: expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

/**
 * Add a new group
 */
export async function addGroup(groupName) {
	try {
		const response = await fetchFromApi('add-group', 'POST', { group_name: groupName });

		if (response.success) {
			// Clear groups cache to force refresh
			await indexedDBService.clearCachedData(GROUPS_CACHE_KEY);
			debugLog(`Group "${groupName}" added successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to add group');
	} catch (error) {
		debugError(`Error adding group "${groupName}":`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('addGroup', { groupName }, 2);
			return {
				success: true,
				offline: true,
				message: 'Group will be created when online',
				tempId: `temp_group_${Date.now()}`
			};
		}

		throw error;
	}
}

/**
 * Remove a group
 */
export async function removeGroup(groupId) {
	try {
		const response = await fetchFromApi('remove-group', 'POST', { group_id: groupId });

		if (response.success) {
			// Clear groups cache to force refresh
			await indexedDBService.clearCachedData(GROUPS_CACHE_KEY);
			debugLog(`Group ${groupId} removed successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to remove group');
	} catch (error) {
		debugError(`Error removing group ${groupId}:`, error);

		// Cannot remove groups offline - this must be done online
		if (error.isOffline) {
			throw new Error('Cannot remove group while offline');
		}

		throw error;
	}
}

/**
 * Update group name
 */
export async function updateGroupName(groupId, newName) {
	try {
		const response = await fetchFromApi('update-group-name', 'POST', {
			group_id: groupId,
			new_name: newName
		});

		if (response.success) {
			// Clear groups cache to force refresh
			await indexedDBService.clearCachedData(GROUPS_CACHE_KEY);
			debugLog(`Group ${groupId} name updated to "${newName}"`);
			return response;
		}

		throw new Error(response.message || 'Failed to update group name');
	} catch (error) {
		debugError(`Error updating group ${groupId} name:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateGroupName', { groupId, newName }, 2);
			return {
				success: true,
				offline: true,
				message: 'Group name changes will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Update participant group assignment and roles
 */
export async function updateParticipantGroup(participantId, groupId, isLeader = false, isSecondLeader = false) {
	try {
		const data = {
			participant_id: participantId,
			group_id: groupId,
			is_leader: isLeader,
			is_second_leader: isSecondLeader
		};

		const response = await fetchFromApi('update-participant-group', 'POST', data);

		if (response.success || response.status === 'success') {
			// Clear participants and groups cache to force refresh
			await indexedDBService.clearCachedData(GROUPS_CACHE_KEY);
			await indexedDBService.clearCachedData('participants_list');
			
			debugLog(`Participant ${participantId} group updated successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to update participant group');
	} catch (error) {
		debugError(`Error updating participant ${participantId} group:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateParticipantGroup', {
				participantId,
				groupId,
				isLeader,
				isSecondLeader
			}, 1);
			return {
				success: true,
				offline: true,
				message: 'Participant group changes will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Get participants by group with roles
 */
export async function getParticipantsByGroupWithRoles(groupId = null) {
	try {
		const params = groupId ? { group_id: groupId } : {};
		const response = await fetchFromApi('get_participants_by_group_with_roles', 'GET', null, params);

		if (response.success) {
			debugLog(`Participants with roles fetched for group: ${groupId || 'all'}`);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participants by group');
	} catch (error) {
		debugError(`Error fetching participants for group ${groupId}:`, error);
		throw error;
	}
}

/**
 * Get group statistics (participant count, leaders, etc.)
 */
export async function getGroupStatistics() {
	const cacheKey = 'group_statistics';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached group statistics');
		return { success: true, statistics: cachedData };
	}

	try {
		const response = await fetchFromApi('get_group_statistics', 'GET');

		if (response.success && response.statistics) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.statistics, 5 * 60 * 1000);
			debugLog('Group statistics fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch group statistics');
	} catch (error) {
		debugError('Error fetching group statistics:', error);
		throw error;
	}
}

/**
 * Batch update multiple participants' group assignments
 */
export async function batchUpdateParticipantGroups(updates) {
	try {
		const response = await fetchFromApi('batch_update_participant_groups', 'POST', { updates });

		if (response.success) {
			// Clear relevant caches
			await indexedDBService.clearCachedData(GROUPS_CACHE_KEY);
			await indexedDBService.clearCachedData('participants_list');
			
			debugLog(`Batch updated ${updates.length} participant group assignments`);
			return response;
		}

		throw new Error(response.message || 'Failed to batch update participant groups');
	} catch (error) {
		debugError('Error batch updating participant groups:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('batchUpdateParticipantGroups', { updates }, 1);
			return {
				success: true,
				offline: true,
				message: 'Group assignments will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Sync offline groups data when back online
 */
export async function syncOfflineGroupsData() {
	try {
		const pendingData = await indexedDBService.getPendingOfflineData();
		const groupsOperations = pendingData.filter(item => 
			['addGroup', 'updateGroupName', 'updateParticipantGroup', 'batchUpdateParticipantGroups'].includes(item.action)
		);

		debugLog(`Syncing ${groupsOperations.length} offline groups operations`);

		const results = [];
		for (const operation of groupsOperations) {
			try {
				await indexedDBService.updateOfflineDataStatus(operation.id, 'processing');

				let result;
				switch (operation.action) {
					case 'addGroup':
						result = await addGroup(operation.data.groupName);
						break;
					case 'updateGroupName':
						result = await updateGroupName(operation.data.groupId, operation.data.newName);
						break;
					case 'updateParticipantGroup':
						result = await updateParticipantGroup(
							operation.data.participantId,
							operation.data.groupId,
							operation.data.isLeader,
							operation.data.isSecondLeader
						);
						break;
					case 'batchUpdateParticipantGroups':
						result = await batchUpdateParticipantGroups(operation.data.updates);
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
		debugError('Error syncing offline groups data:', error);
		return { success: false, error: error.message };
	}
}

export const groupsService = {
	getGroups,
	addGroup,
	removeGroup,
	updateGroupName,
	updateParticipantGroup,
	getParticipantsByGroupWithRoles,
	getGroupStatistics,
	batchUpdateParticipantGroups,
	syncOfflineGroupsData
};

export default groupsService;