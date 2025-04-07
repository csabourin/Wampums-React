// src/components/common/LanguageToggle/LanguageToggle.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

/**
 * Language toggle component for switching between languages
 */
const LanguageToggle = () => {
	const { i18n } = useTranslation();
	const currentLanguage = i18n.language || 'fr';

	const changeLanguage = (lng) => {
		i18n.changeLanguage(lng);
		localStorage.setItem('lang', lng);
	};

	return (
		<div className="language-toggle">
			<button 
				className={`lang-btn ${currentLanguage === 'fr' ? 'active' : ''}`} 
				onClick={() => changeLanguage('fr')}
			>
				FR
			</button>
			<button 
				className={`lang-btn ${currentLanguage === 'en' ? 'active' : ''}`}
				onClick={() => changeLanguage('en')}
			>
				EN
			</button>
		</div>
	);
};

export default LanguageToggle;