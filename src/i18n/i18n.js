// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
	// Load translations from the server
	.use(Backend)
	// Detect user language
	.use(LanguageDetector)
	// Pass the i18n instance to react-i18next
	.use(initReactI18next)
	// Initialize i18next
	.init({
		fallbackLng: 'fr',
		debug: process.env.NODE_ENV === 'development',

		interpolation: {
			escapeValue: false, // React already escapes values
		},

		// Backend options
		backend: {
			// Path where resources will be loaded from
			loadPath: '/locales/{{lng}}/{{ns}}.json',
		},

		detection: {
			// Order of language detection
			order: ['localStorage', 'navigator'],
			// Keys to lookup language from
			lookupLocalStorage: 'lang',
			// Cache detected language in localStorage
			caches: ['localStorage'],
		}
	});

// Function to change the language
export const changeLanguage = (language) => {
	i18n.changeLanguage(language);
	localStorage.setItem('lang', language);
};

export default i18n;