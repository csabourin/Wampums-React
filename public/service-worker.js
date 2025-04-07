// public/service-worker.js
// This service worker file provides caching and offline functionality for the app

const CACHE_NAME = 'scouts-app-v1';
const API_CACHE_NAME = 'scouts-api-v1';
const STATIC_ASSETS = [
	'/',
	'/index.html',
	'/static/js/main.chunk.js',
	'/static/js/vendors~main.chunk.js',
	'/static/js/bundle.js',
	'/static/css/main.chunk.css',
	'/manifest.json',
	'/favicon.ico',
	'/logo192.png',
	'/logo512.png',
	'/locales/en/translation.json',
	'/locales/fr/translation.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installing...');
	self.skipWaiting();

	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.log('[Service Worker] Caching app shell');
				return cache.addAll(STATIC_ASSETS);
			})
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activating...');

	event.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(keyList.map((key) => {
				if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
					console.log('[Service Worker] Removing old cache', key);
					return caches.delete(key);
				}
			}));
		})
	);

	return self.clients.claim();
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Handle API requests separately
	if (url.origin === 'https://wampums-api.replit.app') {
		event.respondWith(handleApiRequest(event.request));
		return;
	}

	// Static assets and other resources
	event.respondWith(
		caches.match(event.request).then((response) => {
			// Cache hit - return the response from the cache
			if (response) {
				return response;
			}

			// Clone the request because it's a one-time use stream
			const fetchRequest = event.request.clone();

			return fetch(fetchRequest).then((response) => {
				// Check if we received a valid response
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}

				// Clone the response because it's a one-time use stream
				const responseToCache = response.clone();

				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseToCache);
				});

				return response;
			}).catch(() => {
				// If the network is unavailable, try to return the offline page
				if (event.request.mode === 'navigate') {
					return caches.match('/offline.html');
				}

				return null;
			});
		})
	);
});

// Handle API requests
async function handleApiRequest(request) {
	// Try to fetch from network first for API requests
	try {
		const response = await fetch(request);

		// If successful, clone and cache the response
		if (response.ok) {
			const clonedResponse = response.clone();
			const cache = await caches.open(API_CACHE_NAME);
			await cache.put(request, clonedResponse);
		}

		return response;
	} catch (error) {
		// If offline, try to get from cache
		const cachedResponse = await caches.match(request);
		if (cachedResponse) {
			return cachedResponse;
		}

		// If not in cache, return a custom offline response for API requests
		return new Response(
			JSON.stringify({ 
				success: false, 
				offline: true, 
				message: 'You are offline. This data is not available in the cache.' 
			}),
			{ 
				headers: { 'Content-Type': 'application/json' } 
			}
		);
	}
}

// Handle Push notifications
self.addEventListener('push', (event) => {
	console.log('[Service Worker] Push received:', event);

	let data = { title: 'New Notification', body: 'Something new happened!' };

	if (event.data) {
		try {
			data = event.data.json();
		} catch (e) {
			data.body = event.data.text();
		}
	}

	const options = {
		body: data.body,
		icon: '/logo192.png',
		badge: '/favicon.ico',
		data: {
			url: data.url || '/'
		}
	};

	event.waitUntil(
		self.registration.showNotification(data.title, options)
	);

	// Also send a message to the client to display an in-app notification
	self.clients.matchAll().then(clients => {
		clients.forEach(client => {
			client.postMessage({
				type: 'PUSH_ALERT',
				title: data.title,
				body: data.body,
				url: data.url
			});
		});
	});
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
	console.log('[Service Worker] Notification click:', event);

	event.notification.close();

	const url = event.notification.data.url || '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window' }).then(clientList => {
			// Check if there's already a window open
			for (let client of clientList) {
				if (client.url === url && 'focus' in client) {
					return client.focus();
				}
			}

			// If no window is open, open a new one
			if (self.clients.openWindow) {
				return self.clients.openWindow(url);
			}
		})
	);
});

// Handle sync events (for offline operations)
self.addEventListener('sync', (event) => {
	console.log('[Service Worker] Background Sync:', event);

	if (event.tag.startsWith('offlineSync')) {
		event.waitUntil(syncOfflineData());
	}
});

// Function to sync offline data with server
async function syncOfflineData() {
	try {
		// Open the database
		const dbName = "ScoutsAppDB";
		const db = await openIndexedDB(dbName);

		// Get all offline data
		const offlineData = await getOfflineData(db);

		if (offlineData.length === 0) {
			console.log('[Service Worker] No offline data to sync');
			return;
		}

		console.log('[Service Worker] Syncing offline data:', offlineData);

		// Process each offline record
		for (const record of offlineData) {
			await processOfflineRecord(record);
		}

		console.log('[Service Worker] Offline data sync completed');
	} catch (error) {
		console.error('[Service Worker] Error syncing offline data:', error);
	}
}

// Open IndexedDB
function openIndexedDB(dbName) {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

// Get offline data from IndexedDB
function getOfflineData(db) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('offlineData', 'readonly');
		const store = transaction.objectStore('offlineData');
		const index = store.index('type_idx');
		const request = index.getAll('offline');

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result || []);
	});
}

// Process an offline record
async function processOfflineRecord(record) {
	try {
		const { action, data } = record;

		// Handle different types of offline actions
		switch (action) {
			case 'saveParticipant':
				await syncParticipant(data);
				break;

			case 'updateAttendance':
				await syncAttendance(data);
				break;

			case 'saveGuardian':
				await syncGuardian(data);
				break;

			// Add more cases for other offline actions

			default:
				console.warn(`[Service Worker] Unknown offline action type: ${action}`);
		}

		// Delete the processed record
		await deleteOfflineRecord(record.key);

	} catch (error) {
		console.error(`[Service Worker] Error processing offline record:`, error);

		// Increment retry count
		if (record.retryCount < 3) {
			await updateRetryCount(record.key, (record.retryCount || 0) + 1);
		} else {
			await deleteOfflineRecord(record.key);
		}
	}
}

// Sync a participant record
async function syncParticipant(data) {
	const url = data.id 
		? `https://wampums-api.replit.app/save_participant?id=${data.id}`
		: `https://wampums-api.replit.app/save_participant`;

	const method = data.id ? 'PUT' : 'POST';

	const response = await fetch(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
			'X-Organization-ID': localStorage.getItem('currentOrganizationId')
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

// Sync attendance record
async function syncAttendance(data) {
	const { participantIds, newStatus, date } = data;

	const response = await fetch('https://wampums-api.replit.app/update_attendance', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
			'X-Organization-ID': localStorage.getItem('currentOrganizationId')
		},
		body: JSON.stringify({
			participant_id: participantIds,
			status: newStatus,
			date
		})
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

// Sync guardian record
async function syncGuardian(data) {
	const response = await fetch('https://wampums-api.replit.app/save_parent', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
			'X-Organization-ID': localStorage.getItem('currentOrganizationId')
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

// Delete an offline record
function deleteOfflineRecord(key) {
	return new Promise(async (resolve, reject) => {
		const db = await openIndexedDB("ScoutsAppDB");
		const transaction = db.transaction('offlineData', 'readwrite');
		const store = transaction.objectStore('offlineData');
		const request = store.delete(key);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

// Update retry count for a record
function updateRetryCount(key, retryCount) {
	return new Promise(async (resolve, reject) => {
		const db = await openIndexedDB("ScoutsAppDB");
		const transaction = db.transaction('offlineData', 'readwrite');
		const store = transaction.objectStore('offlineData');

		// First get the record
		const getRequest = store.get(key);
		getRequest.onerror = () => reject(getRequest.error);
		getRequest.onsuccess = () => {
			const record = getRequest.result;
			if (record) {
				record.retryCount = retryCount;

				// Update the record
				const updateRequest = store.put(record);
				updateRequest.onerror = () => reject(updateRequest.error);
				updateRequest.onsuccess = () => resolve();
			} else {
				resolve(); // Record doesn't exist anymore
			}
		};
	});
}