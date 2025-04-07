// src/components/common/LoadingSpinner/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';
import { useTranslation } from 'react-i18next';

/**
 * Loading spinner component with optional text
 * @param {string} text - Custom loading text
 * @param {boolean} fullScreen - Whether to display as a full-screen overlay
 */
const LoadingSpinner = ({ text, fullScreen = false }) => {
	const { t } = useTranslation();
	const loadingText = text || t('loading');

	const spinnerContent = (
		<>
			<div className="spinner"></div>
			{loadingText && <div className="loading-text">{loadingText}</div>}
		</>
	);

	if (fullScreen) {
		return (
			<div className="loading-overlay">
				<div className="loading-spinner-container">
					{spinnerContent}
				</div>
			</div>
		);
	}

	return (
		<div className="loading-spinner-container">
			{spinnerContent}
		</div>
	);
};

export default LoadingSpinner;