// src/api/meetingService.js
import apiService from './apiService';
import { authService } from './authService';
import indexedDBService from '../lib/indexedDBService';

const API_BASE_URL = 'https://wampums-api.replit.app';
const REUNION_DATES_CACHE_KEY = 'reunion_dates';
const REUNION_PREPARATION_CACHE_PREFIX = 'reunion_preparation_';

export const meetingService = {
	// Get all available meeting dates
	getReunionDates: async () => {
		// Try to get cached data first
		const cachedData = await indexedDBService.getCachedData(REUNION_DATES_CACHE_KEY);
		if (cachedData) {
			console.log('Using cached reunion dates');
			return cachedData;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/get_reunion_dates`, {
				headers: authService.getAuthHeaders()
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const dates = data.dates || [];

			// Cache dates for 30 minutes
			await indexedDBService.setCachedData(REUNION_DATES_CACHE_KEY, dates, 30 * 60 * 1000);

			return dates;
		} catch (error) {
			console.error('Error fetching reunion dates:', error);
			throw error;
		}
	},

	// Get meeting preparation for a specific date
	// If no date provided, gets today's meeting
	getReunionPreparation: async (date = null) => {
		// If no date provided, use today's date
		const targetDate = date || new Date().toISOString().split('T')[0];

		// Try to get cached data first
		const cacheKey = `${REUNION_PREPARATION_CACHE_PREFIX}${targetDate}`;
		const cachedData = await indexedDBService.getCachedData(cacheKey);
		if (cachedData) {
			console.log(`Using cached reunion preparation for ${targetDate}`);
			return cachedData;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/get_reunion_preparation?date=${targetDate}`, {
				headers: authService.getAuthHeaders()
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Cache data for 15 minutes
			await indexedDBService.setCachedData(cacheKey, data, 15 * 60 * 1000);

			return data;
		} catch (error) {
			console.error(`Error fetching reunion preparation for ${targetDate}:`, error);
			throw error;
		}
	},

	// Save meeting preparation
	saveReunionPreparation: async (formData) => {
		try {
			const response = await fetch(`${API_BASE_URL}/save_reunion_preparation`, {
				method: 'POST',
				headers: {
					...authService.getAuthHeaders(),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			// Invalidate cache for this date
			const cacheKey = `${REUNION_PREPARATION_CACHE_PREFIX}${formData.date}`;
			await indexedDBService.deleteOfflineRecord(cacheKey);

			// Invalidate reunion dates cache
			await indexedDBService.deleteOfflineRecord(REUNION_DATES_CACHE_KEY);

			return result;
		} catch (error) {
			console.error('Error saving reunion preparation:', error);

			// If offline, save for later sync
			if (!navigator.onLine) {
				await indexedDBService.saveOfflineData('saveReunionPreparation', formData);
				return { success: true, offline: true, message: 'Saved offline. Will sync when online.' };
			}

			throw error;
		}
	},

	// Get activities for meetings
	getActivitesRencontre: async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/get_activites_rencontre`, {
				headers: authService.getAuthHeaders()
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.activites || [];
		} catch (error) {
			console.error('Error fetching activites rencontre:', error);
			throw error;
		}
	},

	// Get animateurs (meeting leaders)
	getAnimateurs: async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/get_animateurs`, {
				headers: authService.getAuthHeaders()
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.animateurs ||