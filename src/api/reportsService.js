// src/api/reportsService.js
/**
 * Service for reports and analytics operations
 * Priority: MEDIUM - Required for administrative reporting
 */

import { fetchFromApi, debugLog, debugError } from './apiService';
import indexedDBService from '../lib/indexedDBService';

const REPORTS_CACHE_PREFIX = 'report_';

/**
 * Health and Medical Reports
 */

export async function getHealthReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}health`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached health report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_health_report', 'GET');

		if (response.success && response.report) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report, 30 * 60 * 1000);
			debugLog('Health report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch health report');
	} catch (error) {
		debugError('Error fetching health report:', error);
		throw error;
	}
}

export async function getAllergiesReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}allergies`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached allergies report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_allergies_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Allergies report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch allergies report');
	} catch (error) {
		debugError('Error fetching allergies report:', error);
		throw error;
	}
}

export async function getMedicationReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}medications`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached medication report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_medication_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Medication report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch medication report');
	} catch (error) {
		debugError('Error fetching medication report:', error);
		throw error;
	}
}

export async function getVaccineReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}vaccines`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached vaccine report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_vaccine_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Vaccine report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch vaccine report');
	} catch (error) {
		debugError('Error fetching vaccine report:', error);
		throw error;
	}
}

export async function getHealthContactReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}health_contacts`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached health contact report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_health_contact_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Health contact report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch health contact report');
	} catch (error) {
		debugError('Error fetching health contact report:', error);
		throw error;
	}
}

/**
 * Attendance Reports
 */

export async function getAttendanceReport(startDate = null, endDate = null) {
	const cacheKey = `${REPORTS_CACHE_PREFIX}attendance_${startDate}_${endDate}`;
	
	// Try cache first (15 minute expiration for attendance reports)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached attendance report');
		return { success: true, report: cachedData };
	}

	try {
		const params = {};
		if (startDate) params.start_date = startDate;
		if (endDate) params.end_date = endDate;

		const response = await fetchFromApi('get_attendance_report', 'GET', null, params);

		if (response.success && response.report) {
			// Cache for 15 minutes
			await indexedDBService.setCachedData(cacheKey, response.report, 15 * 60 * 1000);
			debugLog('Attendance report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch attendance report');
	} catch (error) {
		debugError('Error fetching attendance report:', error);
		throw error;
	}
}

/**
 * Participant Reports
 */

export async function getParticipantAgeReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}participant_ages`;
	
	// Try cache first (60 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached participant age report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_participant_age_report', 'GET');

		if (response.success) {
			// Cache for 60 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 60 * 60 * 1000);
			debugLog('Participant age report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participant age report');
	} catch (error) {
		debugError('Error fetching participant age report:', error);
		throw error;
	}
}

export async function getParticipantsWithDocuments() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}participant_documents`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached participant documents report');
		return { success: true, participants: cachedData };
	}

	try {
		const response = await fetchFromApi('get_participants_with_documents', 'GET');

		if (response.success && response.participants) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.participants, 30 * 60 * 1000);
			debugLog('Participant documents report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch participant documents');
	} catch (error) {
		debugError('Error fetching participant documents:', error);
		throw error;
	}
}

export async function getMissingDocumentsReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}missing_documents`;
	
	// Try cache first (15 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached missing documents report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_missing_documents_report', 'GET');

		if (response.success) {
			// Cache for 15 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 15 * 60 * 1000);
			debugLog('Missing documents report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch missing documents report');
	} catch (error) {
		debugError('Error fetching missing documents report:', error);
		throw error;
	}
}

export async function getLeaveAloneReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}leave_alone`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached leave alone report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_leave_alone_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Leave alone report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch leave alone report');
	} catch (error) {
		debugError('Error fetching leave alone report:', error);
		throw error;
	}
}

export async function getMediaAuthorizationReport() {
	const cacheKey = `${REPORTS_CACHE_PREFIX}media_authorization`;
	
	// Try cache first (30 minute expiration)
	const cachedData = await indexedDBService.getCachedData(cacheKey);
	if (cachedData) {
		debugLog('Using cached media authorization report');
		return { success: true, report: cachedData };
	}

	try {
		const response = await fetchFromApi('get_media_authorization_report', 'GET');

		if (response.success) {
			// Cache for 30 minutes
			await indexedDBService.setCachedData(cacheKey, response.report || response, 30 * 60 * 1000);
			debugLog('Media authorization report fetched successfully');
			return response;
		}

		throw new Error(response.message || 'Failed to fetch media authorization report');
	} catch (error) {
		debugError('Error fetching media authorization report:', error);
		throw error;
	}
}

/**
 * Export functionality
 */

export async function exportReport(reportType, format = 'csv', params = {}) {
	try {
		const data = { report_type: reportType, format, ...params };
		const response = await fetchFromApi('export_report', 'POST', data);

		if (response.success) {
			debugLog(`Report ${reportType} exported successfully in ${format} format`);
			return response;
		}

		throw new Error(response.message || 'Failed to export report');
	} catch (error) {
		debugError(`Error exporting ${reportType} report:`, error);
		throw error;
	}
}

/**
 * Clear all report caches
 */
export async function clearReportCaches() {
	try {
		// Clear all report-related caches
		const cacheKeys = [
			'health', 'allergies', 'medications', 'vaccines', 'health_contacts',
			'participant_ages', 'participant_documents', 'missing_documents',
			'leave_alone', 'media_authorization'
		];

		for (const key of cacheKeys) {
			await indexedDBService.clearCachedData(`${REPORTS_CACHE_PREFIX}${key}`);
		}

		debugLog('Report caches cleared');
	} catch (error) {
		debugError('Error clearing report caches:', error);
	}
}

export const reportsService = {
	getHealthReport,
	getAllergiesReport,
	getMedicationReport,
	getVaccineReport,
	getHealthContactReport,
	getAttendanceReport,
	getParticipantAgeReport,
	getParticipantsWithDocuments,
	getMissingDocumentsReport,
	getLeaveAloneReport,
	getMediaAuthorizationReport,
	exportReport,
	clearReportCaches
};

export default reportsService;