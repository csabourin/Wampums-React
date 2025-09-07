// src/pages/FormInscription.jsx
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import { participantService } from '../api/participantService';
import { organizationService } from '../api/organizationService';
import { administrativeService } from '../api/administrativeService';
import './FormInscription.css';

const FormInscription = () => {
	const { t } = useTranslation();
	const { currentUser } = useAuth();
	const { participantId } = useParams();
	const navigate = useNavigate();
	
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [participant, setParticipant] = useState(null);
	const [guardians, setGuardians] = useState([]);
	const [formStructures, setFormStructures] = useState({});
	
	// Form data state
	const [participantData, setParticipantData] = useState({
		first_name: '',
		last_name: '',
		date_of_birth: '',
		gender: '',
		address: '',
		city: '',
		postal_code: '',
		phone: '',
		email: '',
		emergency_contact_name: '',
		emergency_contact_phone: '',
		medical_conditions: '',
		medications: '',
		allergies: '',
		dietary_restrictions: '',
		special_needs: '',
		group_preference: '',
		previous_experience: '',
		additional_notes: ''
	});

	// Guardian data state
	const [guardianData, setGuardianData] = useState([
		{
			first_name: '',
			last_name: '',
			relationship: 'parent',
			email: '',
			phone: '',
			address: '',
			city: '',
			postal_code: '',
			workplace: '',
			work_phone: '',
			is_primary: true
		}
	]);

	// Initialize form
	useEffect(() => {
		const initializeForm = async () => {
			setLoading(true);
			try {
				// Fetch form structures
				await fetchFormStructures();

				if (participantId) {
					// Edit mode - fetch existing participant and guardian data
					await fetchParticipantData();
					await fetchGuardianData();
				} else {
					// Create mode - initialize empty forms
					console.log('Initializing empty participant form');
				}

			} catch (error) {
				console.error('Error initializing form:', error);
				setNotification({
					message: t('error_loading_form'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		initializeForm();
	}, [participantId, t]);

	// Fetch form structures from organization settings
	const fetchFormStructures = async () => {
		try {
			const response = await organizationService.getOrganizationFormFormats();
			setFormStructures(response || {});
		} catch (error) {
			console.error('Error fetching form structures:', error);
		}
	};

	// Fetch participant data for editing
	const fetchParticipantData = async () => {
		try {
			const response = await participantService.getParticipant(participantId);
			if (response.success && response.participant) {
				const p = response.participant;
				setParticipant(p);
				setParticipantData({
					first_name: p.first_name || '',
					last_name: p.last_name || '',
					date_of_birth: p.date_of_birth || '',
					gender: p.gender || '',
					address: p.address || '',
					city: p.city || '',
					postal_code: p.postal_code || '',
					phone: p.phone || '',
					email: p.email || '',
					emergency_contact_name: p.emergency_contact_name || '',
					emergency_contact_phone: p.emergency_contact_phone || '',
					medical_conditions: p.medical_conditions || '',
					medications: p.medications || '',
					allergies: p.allergies || '',
					dietary_restrictions: p.dietary_restrictions || '',
					special_needs: p.special_needs || '',
					group_preference: p.group_preference || '',
					previous_experience: p.previous_experience || '',
					additional_notes: p.additional_notes || ''
				});
			}
		} catch (error) {
			console.error('Error fetching participant data:', error);
			throw error;
		}
	};

	// Fetch guardian data for editing
	const fetchGuardianData = async () => {
		try {
			// This would use a guardian service if it exists
			// For now, we'll keep the default guardian structure
			console.log('Guardian data fetching not implemented yet');
		} catch (error) {
			console.error('Error fetching guardian data:', error);
		}
	};

	// Handle participant data changes
	const handleParticipantChange = (field, value) => {
		setParticipantData(prev => ({
			...prev,
			[field]: value
		}));
	};

	// Handle guardian data changes
	const handleGuardianChange = (index, field, value) => {
		setGuardianData(prev => {
			const newData = [...prev];
			newData[index] = {
				...newData[index],
				[field]: value
			};
			return newData;
		});
	};

	// Add guardian
	const addGuardian = () => {
		setGuardianData(prev => [
			...prev,
			{
				first_name: '',
				last_name: '',
				relationship: 'parent',
				email: '',
				phone: '',
				address: '',
				city: '',
				postal_code: '',
				workplace: '',
				work_phone: '',
				is_primary: false
			}
		]);
	};

	// Remove guardian
	const removeGuardian = (index) => {
		if (guardianData.length > 1) {
			setGuardianData(prev => prev.filter((_, i) => i !== index));
		}
	};

	// Form validation
	const validateForm = () => {
		const errors = [];

		// Required participant fields
		const requiredFields = ['first_name', 'last_name', 'date_of_birth'];
		requiredFields.forEach(field => {
			if (!participantData[field]?.trim()) {
				errors.push(t(`${field}_required`));
			}
		});

		// Validate at least one guardian has required info
		const hasValidGuardian = guardianData.some(guardian => 
			guardian.first_name?.trim() && guardian.last_name?.trim() && guardian.phone?.trim()
		);

		if (!hasValidGuardian) {
			errors.push(t('at_least_one_guardian_required'));
		}

		return errors;
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();
		
		// Validate form
		const errors = validateForm();
		if (errors.length > 0) {
			setNotification({
				message: errors.join(', '),
				type: 'error'
			});
			return;
		}

		setSaving(true);
		try {
			let result;
			
			if (participantId) {
				// Update existing participant
				result = await participantService.updateParticipant(participantId, participantData);
			} else {
				// Create new participant
				result = await participantService.createParticipant({
					...participantData,
					guardians: guardianData.filter(g => g.first_name?.trim() && g.last_name?.trim())
				});
			}

			if (result.success) {
				setNotification({
					message: participantId ? t('participant_updated_successfully') : t('participant_created_successfully'),
					type: 'success'
				});

				// Redirect after success
				setTimeout(() => {
					if (currentUser?.role === 'parent') {
						navigate('/parent-dashboard');
					} else {
						navigate('/dashboard');
					}
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save participant');
			}

		} catch (error) {
			console.error('Error saving participant:', error);
			setNotification({
				message: error.message || t('error_saving_participant'),
				type: 'error'
			});
		} finally {
			setSaving(false);
		}
	};

	// Render participant form section
	const renderParticipantForm = () => (
		<div className="form-section">
			<h2>{t('participant_information')}</h2>
			
			<div className="form-row">
				<div className="form-group">
					<label htmlFor="first_name">{t('first_name')} *</label>
					<input
						type="text"
						id="first_name"
						value={participantData.first_name}
						onChange={(e) => handleParticipantChange('first_name', e.target.value)}
						required
					/>
				</div>
				
				<div className="form-group">
					<label htmlFor="last_name">{t('last_name')} *</label>
					<input
						type="text"
						id="last_name"
						value={participantData.last_name}
						onChange={(e) => handleParticipantChange('last_name', e.target.value)}
						required
					/>
				</div>
			</div>

			<div className="form-row">
				<div className="form-group">
					<label htmlFor="date_of_birth">{t('date_of_birth')} *</label>
					<input
						type="date"
						id="date_of_birth"
						value={participantData.date_of_birth}
						onChange={(e) => handleParticipantChange('date_of_birth', e.target.value)}
						required
					/>
				</div>
				
				<div className="form-group">
					<label htmlFor="gender">{t('gender')}</label>
					<select
						id="gender"
						value={participantData.gender}
						onChange={(e) => handleParticipantChange('gender', e.target.value)}
					>
						<option value="">{t('select_gender')}</option>
						<option value="male">{t('male')}</option>
						<option value="female">{t('female')}</option>
						<option value="other">{t('other')}</option>
					</select>
				</div>
			</div>

			<div className="form-row">
				<div className="form-group full-width">
					<label htmlFor="address">{t('address')}</label>
					<input
						type="text"
						id="address"
						value={participantData.address}
						onChange={(e) => handleParticipantChange('address', e.target.value)}
					/>
				</div>
			</div>

			<div className="form-row">
				<div className="form-group">
					<label htmlFor="city">{t('city')}</label>
					<input
						type="text"
						id="city"
						value={participantData.city}
						onChange={(e) => handleParticipantChange('city', e.target.value)}
					/>
				</div>
				
				<div className="form-group">
					<label htmlFor="postal_code">{t('postal_code')}</label>
					<input
						type="text"
						id="postal_code"
						value={participantData.postal_code}
						onChange={(e) => handleParticipantChange('postal_code', e.target.value)}
					/>
				</div>
			</div>

			<div className="form-row">
				<div className="form-group">
					<label htmlFor="phone">{t('phone')}</label>
					<input
						type="tel"
						id="phone"
						value={participantData.phone}
						onChange={(e) => handleParticipantChange('phone', e.target.value)}
					/>
				</div>
				
				<div className="form-group">
					<label htmlFor="email">{t('email')}</label>
					<input
						type="email"
						id="email"
						value={participantData.email}
						onChange={(e) => handleParticipantChange('email', e.target.value)}
					/>
				</div>
			</div>

			{/* Medical Information */}
			<h3>{t('medical_information')}</h3>
			
			<div className="form-group">
				<label htmlFor="allergies">{t('allergies')}</label>
				<textarea
					id="allergies"
					rows={3}
					value={participantData.allergies}
					onChange={(e) => handleParticipantChange('allergies', e.target.value)}
					placeholder={t('list_any_allergies')}
				/>
			</div>

			<div className="form-group">
				<label htmlFor="medications">{t('medications')}</label>
				<textarea
					id="medications"
					rows={3}
					value={participantData.medications}
					onChange={(e) => handleParticipantChange('medications', e.target.value)}
					placeholder={t('list_current_medications')}
				/>
			</div>

			<div className="form-group">
				<label htmlFor="medical_conditions">{t('medical_conditions')}</label>
				<textarea
					id="medical_conditions"
					rows={3}
					value={participantData.medical_conditions}
					onChange={(e) => handleParticipantChange('medical_conditions', e.target.value)}
					placeholder={t('describe_medical_conditions')}
				/>
			</div>
		</div>
	);

	// Render guardian form section
	const renderGuardianForm = (guardian, index) => (
		<div key={index} className="form-section guardian-section">
			<div className="section-header">
				<h3>{t('guardian')} {index + 1}</h3>
				{guardianData.length > 1 && (
					<button
						type="button"
						className="remove-guardian-btn"
						onClick={() => removeGuardian(index)}
					>
						{t('remove')}
					</button>
				)}
			</div>

			<div className="form-row">
				<div className="form-group">
					<label>{t('first_name')} *</label>
					<input
						type="text"
						value={guardian.first_name}
						onChange={(e) => handleGuardianChange(index, 'first_name', e.target.value)}
						required
					/>
				</div>
				
				<div className="form-group">
					<label>{t('last_name')} *</label>
					<input
						type="text"
						value={guardian.last_name}
						onChange={(e) => handleGuardianChange(index, 'last_name', e.target.value)}
						required
					/>
				</div>
			</div>

			<div className="form-row">
				<div className="form-group">
					<label>{t('relationship')}</label>
					<select
						value={guardian.relationship}
						onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)}
					>
						<option value="parent">{t('parent')}</option>
						<option value="guardian">{t('guardian')}</option>
						<option value="grandparent">{t('grandparent')}</option>
						<option value="other">{t('other')}</option>
					</select>
				</div>

				<div className="form-group">
					<label>{t('phone')} *</label>
					<input
						type="tel"
						value={guardian.phone}
						onChange={(e) => handleGuardianChange(index, 'phone', e.target.value)}
						required
					/>
				</div>
			</div>

			<div className="form-group">
				<label>{t('email')}</label>
				<input
					type="email"
					value={guardian.email}
					onChange={(e) => handleGuardianChange(index, 'email', e.target.value)}
				/>
			</div>

			<div className="form-group">
				<label>
					<input
						type="checkbox"
						checked={guardian.is_primary}
						onChange={(e) => handleGuardianChange(index, 'is_primary', e.target.checked)}
					/>
					{t('primary_contact')}
				</label>
			</div>
		</div>
	);

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="form-inscription-page">
			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="page-header">
				<Link 
					to={currentUser?.role === 'parent' ? '/parent-dashboard' : '/dashboard'} 
					className="back-link"
				>
					{t('back')}
				</Link>
				<h1>{participantId ? t('edit_participant') : t('participant_registration')}</h1>
			</div>

			<form onSubmit={handleSubmit} className="inscription-form">
				{renderParticipantForm()}

				{/* Guardians Section */}
				<div className="guardians-container">
					<div className="section-header">
						<h2>{t('guardians_information')}</h2>
						<button
							type="button"
							className="add-guardian-btn"
							onClick={addGuardian}
						>
							{t('add_guardian')}
						</button>
					</div>

					{guardianData.map((guardian, index) => renderGuardianForm(guardian, index))}
				</div>

				{/* Submit Button */}
				<div className="form-actions">
					<button 
						type="submit" 
						className="submit-btn"
						disabled={saving}
					>
						{saving 
							? t('saving') 
							: participantId 
								? t('update_participant') 
								: t('register_participant')
						}
					</button>
				</div>
			</form>
		</div>
	);
};

export default FormInscription;