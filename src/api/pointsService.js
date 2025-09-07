// src/api/pointsService.js
/**
 * Service for points and honors management operations
 * Priority: HIGH - Core functionality for tracking achievements
 */

import { fetchFromApi, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

const HONORS_CACHE_KEY = 'honors_list';
const POINTS_CACHE_PREFIX = 'points_';

/**
 * Points Management
 */

export async function updatePoints(updates) {
	try {
		const response = await fetchFromApi('update-points', 'POST', { updates });

		if (response.success) {
			// Clear points-related caches
			await clearPointsCaches();
			debugLog(`Points updated for ${updates.length} participants`);
			return response;
		}

		throw new Error(response.message || 'Failed to update points');
	} catch (error) {
		debugError('Error updating points:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updatePoints', { updates }, 1);
			return {
				success: true,
				offline: true,
				message: 'Points changes will be saved when online'
			};
		}

		throw error;
	}
}

export async function getPointsReport() {
	const cacheKey = 'points_report';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached points report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('points-report', 'GET');

		if (response.success && response.report) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.report, 5 * 60 * 1000);
			debugLog('Points report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch points report');
	} catch (error) {
		debugError('Error fetching points report:', error);
		throw error;
	}
}

/**
 * Honors Management
 */

export async function getHonorsAndParticipants(date = null) {
	const cacheKey = date ? `honors_participants_${date}` : 'honors_participants_all';
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached honors and participants data${date ? ` for ${date}` : ''}`);
		return { success: true, ...cachedData };
	}

	try {
		const params = date ? { date } : {};
		const response = await fetchFromApi('get_honors_and_participants', 'GET', null, params);

		if (response.success) {
			// Cache for 10 minutes
			const dataToCache = {
				honors: response.honors,
				participants: response.participants
			};
			await indexedDBService.setCachedData(cacheKey, dataToCache, 10 * 60 * 1000);
			debugLog(`Honors and participants fetched${date ? ` for ${date}` : ''}`);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch honors and participants');
	} catch (error) {
		debugError('Error fetching honors and participants:', error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return { success: true, ...expiredCache, isOffline: true };
			}
		}

		throw error;
	}
}

export async function getHonors(date) {
	const cacheKey = `honors_${date}`;
	
	// Try cache first (15 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached honors for ${date}`);
		return cachedData;
	}

	try {
		const response = await fetchFromApi('honors', 'GET');

		if (response.success || Array.isArray(response)) {
			const honorsData = response.success ? response.honors : response;
			// Cache for 15 minutes
			await indexedDBService.setCachedData(cacheKey, honorsData, 15 * 60 * 1000);
			debugLog(`Honors fetched for ${date}`);
			return honorsData;
		}

		throw new Error(response.message || 'Failed to fetch honors');
	} catch (error) {
		debugError(`Error fetching honors for ${date}:`, error);

		// If offline, try to return expired cached data
		if (error.isOffline) {
			const expiredCache = await indexedDBService.getCachedData(cacheKey, true);
			if (expiredCache) {
				return expiredCache;
			}
		}

		throw error;
	}
}

export async function awardHonor(honors) {
	try {
		// Ensure honors is an array
		const honorsArray = Array.isArray(honors) ? honors : [honors];
		
		const response = await fetchFromApi('award-honor', 'POST', { honors: honorsArray });

		if (response.success) {
			// Clear honors-related caches
			await clearHonorsCaches();
			debugLog(`${honorsArray.length} honor(s) awarded successfully`);
			return response;
		}

		throw new Error(response.message || 'Failed to award honor');
	} catch (error) {
		debugError('Error awarding honor:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('awardHonor', { 
				honors: Array.isArray(honors) ? honors : [honors] 
			}, 1);
			return {
				success: true,
				offline: true,
				message: 'Honor awards will be saved when online'
			};
		}

		throw error;
	}
}

export async function getRecentHonors() {
	const cacheKey = 'recent_honors';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached recent honors');
		return { success: true, honors: cachedData };
	}

	try {
		const response = await fetchFromApi('recent-honors', 'GET');

		if (response.success && response.honors) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.honors, 5 * 60 * 1000);
			debugLog('Recent honors fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch recent honors');
	} catch (error) {
		debugError('Error fetching recent honors:', error);
		throw error;
	}
}

export async function getHonorsReport() {
	const cacheKey = 'honors_report';
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached honors report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('honors-report', 'GET');

		if (response.success && response.report) {
			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, response.report, 10 * 60 * 1000);
			debugLog('Honors report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch honors report');
	} catch (error) {
		debugError('Error fetching honors report:', error);
		throw error;
	}
}

/**
 * Badge Management
 */

export async function getBadgeProgress(participantId) {
	const cacheKey = `badge_progress_${participantId}`;
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached badge progress for participant ${participantId}`);
		return { success: true, badges: cachedData };
	}

	try {
		const response = await fetchFromApi('badge-progress', 'GET');

		if (response.success && response.badges) {
			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, response.badges, 10 * 60 * 1000);
			debugLog(`Badge progress fetched for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch badge progress');
	} catch (error) {
		debugError(`Error fetching badge progress for participant ${participantId}:`, error);
		throw error;
	}
}

export async function saveBadgeProgress(badgeData) {
	try {
		const response = await fetchFromApi('save-badge-progress', 'POST', badgeData);

		if (response.success) {
			// Clear badge progress cache for the participant
			if (badgeData.participant_id) {
				await indexedDBService.clearCachedData(`badge_progress_${badgeData.participant_id}`);
			}
			
			debugLog('Badge progress saved successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to save badge progress');
	} catch (error) {
		debugError('Error saving badge progress:', error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('saveBadgeProgress', badgeData, 2);
			return {
				success: true,
				offline: true,
				message: 'Badge progress will be saved when online'
			};
		}

		throw error;
	}
}

export async function getPendingBadges() {
	const cacheKey = 'pending_badges';
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached pending badges');
		return { success: true, badges: cachedData };
	}

	try {
		const response = await fetchFromApi('pending-badges', 'GET');

		if (response.success && response.badges) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.badges, 5 * 60 * 1000);
			debugLog('Pending badges fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch pending badges');
	} catch (error) {
		debugError('Error fetching pending badges:', error);
		throw error;
	}
}

export async function updateBadgeStatus(badgeId, action) {
	try {
		const response = await fetchFromApi('update_badge_status', 'POST', {
			badge_id: badgeId,
			action
		});

		if (response.success) {
			// Clear pending badges cache to force refresh
			await indexedDBService.clearCachedData('pending_badges');
			debugLog(`Badge ${badgeId} status updated with action: ${action}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update badge status');
	} catch (error) {
		debugError(`Error updating badge ${badgeId} status:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateBadgeStatus', { badgeId, action }, 2);
			return {
				success: true,
				offline: true,
				message: 'Badge status changes will be saved when online'
			};
		}

		throw error;
	}
}

/**
 * Calendar/Payment Management
 */

export async function getCalendars() {
	const cacheKey = 'calendars';
	
	// Try cache first (10 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached calendars data');
		return { success: true, calendars: cachedData };
	}

	try {
		const response = await fetchFromApi('calendars', 'GET');

		if (response.success && response.calendars) {
			// Cache for 10 minutes
			await indexedDBService.setCachedData(cacheKey, response.calendars, 10 * 60 * 1000);
			debugLog('Calendars fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch calendars');
	} catch (error) {
		debugError('Error fetching calendars:', error);
		throw error;
	}
}

export async function updateCalendar(participantId, amount, amountPaid) {
	try {
		const response = await fetchFromApi('update-calendar', 'POST', {
			participant_id: participantId,
			amount,
			amount_paid: amountPaid
		});

		if (response.success) {
			// Clear calendars cache
			await indexedDBService.clearCachedData('calendars');
			debugLog(`Calendar updated for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update calendar');
	} catch (error) {
		debugError(`Error updating calendar for participant ${participantId}:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateCalendar', {
				participantId,
				amount,
				amountPaid
			}, 2);
			return {
				success: true,
				offline: true,
				message: 'Calendar changes will be saved when online'
			};
		}

		throw error;
	}
}

export async function updateCalendarPaid(participantId, paidStatus) {
	try {
		const response = await fetchFromApi('update-calendar-paid', 'POST', {
			participant_id: participantId,
			paid: paidStatus
		});

		if (response.success) {
			// Clear calendars cache
			await indexedDBService.clearCachedData('calendars');
			debugLog(`Calendar paid status updated for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to update calendar paid status');
	} catch (error) {
		debugError(`Error updating calendar paid status for participant ${participantId}:`, error);

		// Save for offline sync if device is offline
		if (error.isOffline) {
			await indexedDBService.saveOfflineData('updateCalendarPaid', {
				participantId,
				paidStatus
			}, 2);
			return {
				success: true,
				offline: true,
				message: 'Calendar payment status will be saved when online'
			};
		}

		throw error;
	}
}

export async function getParticipantCalendar(participantId) {
	const cacheKey = `participant_calendar_${participantId}`;
	
	// Try cache first (5 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog(`Using cached calendar for participant ${participantId}`);
		return { success: true, calendar: cachedData };
	}

	try {
		const response = await fetchFromApi('get_participant_calendar', 'GET', null, {
			participant_id: participantId
		});

		if (response.success && response.calendar) {
			// Cache for 5 minutes
			await indexedDBService.setCachedData(cacheKey, response.calendar, 5 * 60 * 1000);
			debugLog(`Calendar fetched for participant ${participantId}`);
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participant calendar');
	} catch (error) {
		debugError(`Error fetching calendar for participant ${participantId}:`, error);
		throw error;
	}
}

/**
 * Cache management helpers
 */
async function clearPointsCaches() {
	try {
		await indexedDBService.clearCachedData('points_report');
		await indexedDBService.clearCachedData('participants_list');
		debugLog('Points caches cleared');
	} catch (error) {
		debugError('Error clearing points caches:', error);
	}
}

async function clearHonorsCaches() {
	try {
		await indexedDBService.clearCachedData(HONORS_CACHE_KEY);
		await indexedDBService.clearCachedData('recent_honors');
		await indexedDBService.clearCachedData('honors_report');
		await indexedDBService.clearCachedData('pending_badges');
		
		// Clear date-specific honors caches (approximation)
		const currentDate = new Date();
		for (let i = -7; i <= 7; i++) {
			const date = new Date(currentDate);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];
			await indexedDBService.clearCachedData(`honors_${dateStr}`);
			await indexedDBService.clearCachedData(`honors_participants_${dateStr}`);
		}
		
		debugLog('Honors caches cleared');
	} catch (error) {
		debugError('Error clearing honors caches:', error);
	}
}

/**
 * Sync offline points and honors data when back online
 */
export async function syncOfflinePointsData() {
	try {
		const pendingData = await indexedDBService.getPendingOfflineData();
		const pointsOperations = pendingData.filter(item => 
			['updatePoints', 'awardHonor', 'saveBadgeProgress', 'updateBadgeStatus', 'updateCalendar', 'updateCalendarPaid'].includes(item.action)
		);

		debugLog(`Syncing ${pointsOperations.length} offline points/honors operations`);

		const results = [];
		for (const operation of pointsOperations) {
			try {
				await indexedDBService.updateOfflineDataStatus(operation.id, 'processing');

				let result;
				switch (operation.action) {
					case 'updatePoints':
						result = await updatePoints(operation.data.updates);
						break;
					case 'awardHonor':
						result = await awardHonor(operation.data.honors);
						break;
					case 'saveBadgeProgress':
						result = await saveBadgeProgress(operation.data);
						break;
					case 'updateBadgeStatus':
						result = await updateBadgeStatus(operation.data.badgeId, operation.data.action);
						break;
					case 'updateCalendar':
						result = await updateCalendar(
							operation.data.participantId,
							operation.data.amount,
							operation.data.amountPaid
						);
						break;
					case 'updateCalendarPaid':
						result = await updateCalendarPaid(operation.data.participantId, operation.data.paidStatus);
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
		debugError('Error syncing offline points/honors data:', error);
		return { success: false, error: error.message };
	}
}

export const pointsService = {
	updatePoints,
	getPointsReport,
	getHonorsAndParticipants,
	getHonors,
	awardHonor,
	getRecentHonors,
	getHonorsReport,
	getBadgeProgress,
	saveBadgeProgress,
	getPendingBadges,
	updateBadgeStatus,
	getCalendars,
	updateCalendar,
	updateCalendarPaid,
	getParticipantCalendar,
	syncOfflinePointsData
};

export default pointsService;