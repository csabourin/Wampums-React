// src/lib/indexedDBService.js
import Dexie from 'dexie';

class IndexedDBService {
	constructor() {
		this.db = new Dexie('ScoutsAppDB');
		this.db.version(1).stores({
			offlineData: '++id, key, type, timestamp, expiration',
			cacheData: 'key, data, timestamp, expiration'
		});
	}

	// Cache data with expiration time
	async setCachedData(key, data, expirationTime = 2 * 60 * 60 * 1000) { // Default: 2 hours
		try {
			const record = {
				key,
				data,
				timestamp: Date.now(),
				expiration: Date.now() + expirationTime
			};

			await this.db.cacheData.put(record);
			console.log(`Data stored in cache with key: ${key}`);
			return true;
		} catch (error) {
			console.error(`Error storing data in cache with key ${key}:`, error);
			return false;
		}
	}

	// Get cached data if not expired
	async getCachedData(key) {
		try {
			const record = await this.db.cacheData.get(key);

			if (record && record.expiration > Date.now()) {
				console.log(`Retrieved valid cached data for key: ${key}`);
				return record.data;
			} 

			if (record) {
				console.log(`Data expired for key: ${key}`);
				await this.db.cacheData.delete(key);
			} else {
				console.log(`No data found for key: ${key}`);
			}

			return null;
		} catch (error) {
			console.error(`Error retrieving cached data for key ${key}:`, error);
			return null;
		}
	}

	// Store offline data for sync later
	async saveOfflineData(action, data) {
		try {
			const record = {
				key: `${action}_${Date.now()}`,
				type: 'offline',
				action,
				data,
				timestamp: Date.now(),
				retryCount: 0
			};

			await this.db.offlineData.add(record);
			console.log(`Saved offline data for action: ${action}`);
			return true;
		} catch (error) {
			console.error(`Error saving offline data for action ${action}:`, error);
			return false;
		}
	}

	// Get all offline data
	async getOfflineData() {
		try {
			return await this.db.offlineData
				.where('type')
				.equals('offline')
				.toArray();
		} catch (error) {
			console.error('Error retrieving offline data:', error);
			return [];
		}
	}

	// Clear offline data
	async clearOfflineData() {
		try {
			await this.db.offlineData
				.where('type')
				.equals('offline')
				.delete();
			return true;
		} catch (error) {
			console.error('Error clearing offline data:', error);
			return false;
		}
	}

	// Delete an offline record
	async deleteOfflineRecord(key) {
		try {
			await this.db.offlineData.delete(key);
			return true;
		} catch (error) {
			console.error(`Error deleting offline record with key ${key}:`, error);
			return false;
		}
	}

	// Update retry count for a record
	async updateRetryCount(key, retryCount) {
		try {
			await this.db.offlineData.update(key, { retryCount });
			return true;
		} catch (error) {
			console.error(`Error updating retry count for key ${key}:`, error);
			return false;
		}
	}
}

export const indexedDBService = new IndexedDBService();
export default indexedDBService;