// src/api/attendanceService.js
/**
 * Service for attendance management operations
 * Priority: HIGH - Core functionality for tracking attendance
 */

import { fetchFromApi, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

const ATTENDANCE_CACHE_PREFIX = 'attendance_';
const ATTENDANCE_DATES_CACHE_KEY = 'attendance_dates';
const GUESTS_CACHE_PREFIX = 'guests_';

/**
 * Get attendance data for a specific date
 */
export async function getAttendance(date) {
	const cacheKey = `${ATTENDANCE_CACHE_PREFIX}${date}`;
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached attendance data for ${date}`);
		return cachedData;
	}

	try {
		const response = await fetchFromApi('attendance', 'GET');

		if (response.success || response.attendance) {
			const attendanceData = response.attendance || response;
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, attendanceData, 5 * 60 * 1000);
			debugLog(`Attendance data fetched for ${date}`);
			return attendanceData;
		}

		throw new Error(response.message || 'Failed to fetch attendance data');
	} catch (error) {
		debugError(`Error fetching attendance for ${date}:`, error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { ...expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

/**
 * Update attendance for participants
 */
export async function updateAttendance(participantIds, status, date, previousStatus = null) {
	try {
		// Ensure participantIds is an array
		const ids = Array.isArray(participantIds) ? participantIds : [participantIds];
		
		const data = {
			participant_ids: ids,
			status,
			date,
			previous_status: previousStatus
		};

		const response = await fetchFromApi('update-attendance', 'POST', data);

		if (response.success) {
			// Clear attendance cache for the date to force refresh
			const cacheKey = `${ATTENDANCE_CACHE_PREFIX}${date}`;
			await indexedDBService.clearCachedData(cacheKey);
			
			debugLog(`Attendance updated for ${ids.length} participant(s) on ${date}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update attendance');
	} catch (error) {
		debugError('Error updating attendance:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateAttendance', {
				participantIds: Array.isArray(participantIds) ? participantIds : [participantIds],
				status,
				date,
				previousStatus
			}, 1);
			
			return {
				success: true,
				offline: true,
				message: 'Attendance changes will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Get available attendance dates
 */
export async function getAttendanceDates() {
	const cacheKey = ATTENDANCE_DATES_CACHE_KEY;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached attendance dates');
		return { success: true, dates: cachedData };
	}

	try {
		const response = await fetchFromApi('attendance-dates', 'GET');

		if (response.success && response.dates) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.dates, 30 * 60 * 1000);
			debugLog('Attendance dates fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch attendance dates');
	} catch (error) {
		debugError('Error fetching attendance dates:', error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { success: true, dates: expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

/**
 * Get available meeting dates
 */
export async function getAvailableDates() {
	try {
		const response = await fetchFromApi('available-dates', 'GET');

		if (response.success) {
			debugLog('Available dates fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch available dates');
	} catch (error) {
		debugError('Error fetching available dates:', error);
		throw error;
	}
}

/**
 * Get reunion/meeting dates
 */
export async function getReunionDates() {
	const cacheKey = 'reunion_dates';
	
	// Try cache first (60 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached reunion dates');
		return { success: true, dates: cachedData };
	}

	try {
		const response = await fetchFromApi('get_reunion_dates', 'GET');

		if (response.success && response.dates) {
			// Cache for 60 minutes
			await indexedDBService.setCachedData(cacheKey, response.dates, 60 * 60 * 1000);
			debugLog('Reunion dates fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch reunion dates');
	} catch (error) {
		debugError('Error fetching reunion dates:', error);
		throw error;
	}
}

/**
 * Guest Management
 */

export async function saveGuest(guestData) {
	try {
		const response = await fetchFromApi('save-guest', 'POST', guestData);

		if (response.success) {
			// Clear guests cache for the date
			const date = guestData.attendance_date;
			const cacheKey = `${GUESTS_CACHE_PREFIX}${date}`;
			await indexedDBService.clearCachedData(cacheKey);
			
			debugLog('Guest saved successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to save guest');
	} catch (error) {
		debugError('Error saving guest:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('saveGuest', guestData, 2);
			return {
				success: true,
				offline: true,
				message: 'Guest will be saved when online'
			};
		}

		throw error;
	}
}

export async function getGuestsByDate(date) {
	const cacheKey = `${GUESTS_CACHE_PREFIX}${date}`;
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached guests data for ${date}`);
		return cachedData;
	}

	try {
		const response = await fetchFromApi('guests-by-date', 'GET');

		// Handle both response formats
		let guestsData;
		if (response.success && response.guests) {
			guestsData = response.guests;
		} else if (Array.isArray(response)) {
			guestsData = response;
		} else {
			guestsData = [];
		}

		// Cache for 10 minutes
		await indexedDBService.setCachedData(cacheKey, guestsData, 10 * 60 * 1000);
		debugLog(`Guests data fetched for ${date}`);
		return guestsData;
	} catch (error) {
		debugError(`Error fetching guests for ${date}:`, error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return expiredCache;
			}
		}

		// Return empty array on error
		return [];
	}
}

/**
 * Meeting Preparation
 */

export async function saveReunionPreparation(formData) {
	try {
		const response = await fetchFromApi('save_reunion_preparation', 'POST', formData);

		if (response.success) {
			debugLog('Reunion preparation saved successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to save reunion preparation');
	} catch (error) {
		debugError('Error saving reunion preparation:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('saveReunionPreparation', formData, 2);
			return {
				success: true,
				offline: true,
				message: 'Reunion preparation will be saved when online'
			};
		}

		throw error;
	}
}

export async function getReunionPreparation(date) {
	const cacheKey = `reunion_prep_${date}`;
	
	// Try cache first (15 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached reunion preparation for ${date}`);
		return { success: true, data: cachedData };
	}

	try {
		const response = await fetchFromApi('get_reunion_preparation', 'GET', null, { date });

		if (response.success) {
			// Cache for 15 minutes
			await indexedDBService.setCachedData(cacheKey, response.data, 15 * 60 * 1000);
			debugLog(`Reunion preparation fetched for ${date}`);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch reunion preparation');
	} catch (error) {
		debugError(`Error fetching reunion preparation for ${date}:`, error);
		throw error;
	}
}

/**
 * Activity and Animation Management
 */

export async function getActivitesRencontre() {
	const cacheKey = 'activites_rencontre';
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached activites rencontre');
		return { success: true, activities: cachedData };
	}

	try {
		const response = await fetchFromApi('get_activites_rencontre', 'GET');

		if (response.success && response.activities) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.activities, 30 * 60 * 1000);
			debugLog('Activites rencontre fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch activites rencontre');
	} catch (error) {
		debugError('Error fetching activites rencontre:', error);
		throw error;
	}
}

export async function getAnimateurs() {
	const cacheKey = 'animateurs';
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached animateurs');
		return { success: true, animateurs: cachedData };
	}

	try {
		const response = await fetchFromApi('get_animateurs', 'GET');

		if (response.success && response.animateurs) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.animateurs, 30 * 60 * 1000);
			debugLog('Animateurs fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch animateurs');
	} catch (error) {
		debugError('Error fetching animateurs:', error);
		throw error;
	}
}

/**
 * Sync offline attendance data when back online
 */
export async function syncOfflineAttendanceData() {
	try {
		const pendingData = await indexedDBService.getPendingOfflineData();
		const attendanceOperations = pendingData.filter(item => 
			['updateAttendance', 'saveGuest', 'saveReunionPreparation'].includes(item.action)
		);

		debugLog(`Syncing ${attendanceOperations.length} offline attendance operations`);

		const results = [];
		for (const operation of attendanceOperations) {
			try {
				await indexedDBService.updateOfflineDataStatus(operation.id, 'processing');

				let result;
				switch (operation.action) {
					case 'updateAttendance':
						result = await updateAttendance(
							operation.data.participantIds,
							operation.data.status,
							operation.data.date,
							operation.data.previousStatus
						);
						break;
					case 'saveGuest':
						result = await saveGuest(operation.data);
						break;
					case 'saveReunionPreparation':
						result = await saveReunionPreparation(operation.data);
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
		debugError('Error syncing offline attendance data:', error);
		return { success: false, error: error.message };
	}
}

export const attendanceService = {
	getAttendance,
	updateAttendance,
	getAttendanceDates,
	getAvailableDates,
	getReunionDates,
	saveGuest,
	getGuestsByDate,
	saveReunionPreparation,
	getReunionPreparation,
	getActivitesRencontre,
	getAnimateurs,
	syncOfflineAttendanceData
};

export default attendanceService;