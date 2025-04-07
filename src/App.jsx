// src/App.js
import React, { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './routes';
import LoadingSpinner from './components/common/LoadingSpinner/LoadingSpinner';
import Notification from './components/common/Notification/Notification';
import { organizationService } from './api/organizationService';
import './i18n/i18n';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Fetch organization ID
        const organizationId = await organizationService.fetchOrganizationId();
        console.log('Organization ID:', organizationId);

        // 2. Try to fetch organization settings
        try {
          const settings = await organizationService.getOrganizationSettings();
          console.log('Organization settings loaded:', settings);
        } catch (settingsError) {
          console.error('Error loading organization settings:', settingsError);
          // Don't block initialization if settings fail to load
        }

        // App is initialized
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setError(error.message || 'Error initializing the application');
      }
    };

    initializeApp();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNotification({
        message: 'You are back online',
        type: 'success'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNotification({
        message: 'You are offline. Some features may be limited.',
        type: 'warning'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <LoadingSpinner fullScreen text="Initializing application..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h1>Application Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Application
        </button>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className={`app ${!isOnline ? 'offline' : ''}`}>
        {notification.message && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ message: '', type: '' })}
          />
        )}

        {!isOnline && (
          <div className="offline-indicator">
            You are offline. Some features may be limited.
          </div>
        )}

        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;