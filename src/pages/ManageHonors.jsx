// src/pages/ManageHonors.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import { pointsService } from '../api/pointsService';
import './ManageHonors.css';

const ManageHonors = () => {
	const { t } = useTranslation();
	
	const [loading, setLoading] = useState(true);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
	const [availableDates, setAvailableDates] = useState([]);
	const [allHonors, setAllHonors] = useState([]);
	const [allParticipants, setAllParticipants] = useState([]);
	const [groupedParticipants, setGroupedParticipants] = useState({});
	const [selectedParticipants, setSelectedParticipants] = useState([]);

	// Initialize data
	useEffect(() => {
		const initializeData = async () => {
			setLoading(true);
			try {
				await fetchData();
			} catch (error) {
				console.error('Error initializing manage honors:', error);
				setNotification({
					message: t('error_loading_data'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, [currentDate, t]);

	// Fetch honors and participants data
	const fetchData = async () => {
		try {
			const data = await pointsService.getHonorsAndParticipants(currentDate);
			
			if (data.success) {
				setAllParticipants(data.participants || []);
				setAllHonors(data.honors || []);
				setAvailableDates(data.availableDates || []);

				// Ensure current date is in available dates
				const today = new Date().toLocaleDateString('en-CA');
				let dates = data.availableDates || [];
				
				if (!dates.includes(today)) {
					dates.unshift(today);
				}
				
				if (!dates.includes(currentDate)) {
					dates.push(currentDate);
				}
				
				// Sort dates in descending order
				dates.sort((a, b) => new Date(b) - new Date(a));
				setAvailableDates(dates);

				processHonors(data.participants || [], data.honors || []);
			}
		} catch (error) {
			console.error('Error fetching honors data:', error);
			throw error;
		}
	};

	// Process honors data to organize by groups
	const processHonors = (participants, honors) => {
		const today = new Date().toLocaleDateString('en-CA');
		const isCurrentDate = currentDate === today;
		
		const participantMap = new Map();

		participants.forEach(participant => {
			const honorsForDate = honors.filter(
				honor => honor.participant_id === participant.participant_id && honor.date === currentDate
			);
			const totalHonors = honors.filter(
				honor => honor.participant_id === participant.participant_id && new Date(honor.date) <= new Date(currentDate)
			).length;

			const processedParticipant = {
				...participant,
				honored_today: honorsForDate.length > 0,
				total_honors: totalHonors,
				visible: isCurrentDate || honorsForDate.length > 0
			};

			// Only add visible participants
			if (processedParticipant.visible) {
				if (!participantMap.has(participant.group_id)) {
					participantMap.set(participant.group_id, {
						id: participant.group_id,
						name: participant.group_name === "no_group" ? t('no_group') : participant.group_name,
						participants: []
					});
				}

				participantMap.get(participant.group_id).participants.push(processedParticipant);
			}
		});

		// Sort participants within each group
		participantMap.forEach(group => {
			group.participants.sort((a, b) => {
				if (a.is_leader && !b.is_leader) return -1;
				if (!a.is_leader && b.is_leader) return 1;
				if (a.is_second_leader && !b.is_second_leader) return 1;
				if (!a.is_second_leader && b.is_second_leader) return -1;
				return a.first_name.localeCompare(b.first_name);
			});
		});

		// Convert to object and sort groups
		const grouped = Array.from(participantMap.values()).sort((a, b) => a.name.localeCompare(b.name));
		const groupedObject = {};
		grouped.forEach(group => {
			groupedObject[group.id] = group;
		});
		
		setGroupedParticipants(groupedObject);
	};

	// Handle date change
	const handleDateChange = (newDate) => {
		setCurrentDate(newDate);
		setSelectedParticipants([]);
	};

	// Handle participant selection
	const handleParticipantSelect = (participant) => {
		setSelectedParticipants(prev => {
			const isSelected = prev.some(p => p.participant_id === participant.participant_id);
			
			if (isSelected) {
				return prev.filter(p => p.participant_id !== participant.participant_id);
			} else {
				return [...prev, participant];
			}
		});
	};

	// Handle group selection
	const handleGroupSelect = (group) => {
		const groupParticipants = group.participants.filter(p => !p.honored_today);
		const allSelected = groupParticipants.every(p => 
			selectedParticipants.some(sp => sp.participant_id === p.participant_id)
		);

		if (allSelected) {
			// Deselect all in group
			setSelectedParticipants(prev => 
				prev.filter(sp => !groupParticipants.some(gp => gp.participant_id === sp.participant_id))
			);
		} else {
			// Select all in group
			setSelectedParticipants(prev => {
				const filtered = prev.filter(sp => !groupParticipants.some(gp => gp.participant_id === sp.participant_id));
				return [...filtered, ...groupParticipants];
			});
		}
	};

	// Award honors to selected participants
	const awardHonors = async () => {
		if (selectedParticipants.length === 0) {
			setNotification({
				message: t('no_participants_selected'),
				type: 'error'
			});
			return;
		}

		try {
			const honors = selectedParticipants.map(participant => ({
				participant_id: participant.participant_id,
				date: currentDate,
				reason: 'Manual honor award'
			}));

			const response = await pointsService.awardHonor(honors);

			if (response.success) {
				setNotification({
					message: t('honors_awarded_successfully'),
					type: 'success'
				});

				// Refresh data
				await fetchData();
				setSelectedParticipants([]);
			} else {
				throw new Error(response.message || 'Failed to award honors');
			}
		} catch (error) {
			console.error('Error awarding honors:', error);
			setNotification({
				message: t('error_awarding_honors'),
				type: 'error'
			});
		}
	};

	// Format date for display
	const formatDate = (dateString) => {
		const options = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Toronto' };
		const localDate = new Date(dateString + 'T00:00:00');
		return localDate.toLocaleDateString(t('locale'), options);
	};

	// Check if participant is selected
	const isParticipantSelected = (participant) => {
		return selectedParticipants.some(p => p.participant_id === participant.participant_id);
	};

	// Check if all group participants are selected
	const isGroupSelected = (group) => {
		const eligibleParticipants = group.participants.filter(p => !p.honored_today);
		return eligibleParticipants.length > 0 && 
			   eligibleParticipants.every(p => isParticipantSelected(p));
	};

	// Render participant row
	const renderParticipant = (participant) => {
		const canBeHonored = !participant.honored_today;
		const isSelected = isParticipantSelected(participant);

		return (
			<div
				key={participant.participant_id}
				className={`participant-row ${isSelected ? 'selected' : ''} ${!canBeHonored ? 'already-honored' : ''}`}
				onClick={() => canBeHonored && handleParticipantSelect(participant)}
			>
				<div className="participant-info">
					<span className="participant-name">
						{participant.first_name} {participant.last_name}
						{participant.is_leader && <span className="badge leader">{t('leader')}</span>}
						{participant.is_second_leader && <span className="badge second-leader">{t('second_leader')}</span>}
					</span>
					<div className="participant-stats">
						<span className="total-honors">{participant.total_honors} {t('total_honors')}</span>
						{participant.honored_today && <span className="honored-today">{t('honored_today')}</span>}
					</div>
				</div>
				{canBeHonored && (
					<input
						type="checkbox"
						checked={isSelected}
						onChange={() => handleParticipantSelect(participant)}
						onClick={(e) => e.stopPropagation()}
					/>
				)}
			</div>
		);
	};

	// Render group section
	const renderGroup = (group) => {
		const eligibleCount = group.participants.filter(p => !p.honored_today).length;
		const selectedCount = group.participants.filter(p => isParticipantSelected(p)).length;
		const isGroupFullySelected = isGroupSelected(group);

		return (
			<div key={group.id} className="group-section">
				<div
					className={`group-header ${isGroupFullySelected ? 'selected' : ''}`}
					onClick={() => eligibleCount > 0 && handleGroupSelect(group)}
				>
					<div className="group-info">
						<span className="group-name">{group.name}</span>
						<span className="group-stats">
							{selectedCount > 0 && `${selectedCount}/`}{eligibleCount} {t('eligible')}
						</span>
					</div>
					{eligibleCount > 0 && (
						<input
							type="checkbox"
							checked={isGroupFullySelected}
							onChange={() => handleGroupSelect(group)}
							onClick={(e) => e.stopPropagation()}
						/>
					)}
				</div>
				<div className="group-content">
					{group.participants.map(renderParticipant)}
				</div>
			</div>
		);
	};

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="manage-honors-page">
			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="page-header">
				<Link to="/dashboard" className="back-link">{t('back_to_dashboard')}</Link>
				<h1>{t('manage_honors')}</h1>
			</div>

			<div className="controls">
				<div className="date-control">
					<label htmlFor="date-select">{t('select_date')}:</label>
					<select
						id="date-select"
						value={currentDate}
						onChange={(e) => handleDateChange(e.target.value)}
					>
						{availableDates.map(date => (
							<option key={date} value={date}>
								{formatDate(date)}
							</option>
						))}
					</select>
				</div>

				<div className="selection-info">
					{selectedParticipants.length > 0 && (
						<span className="selected-count">
							{selectedParticipants.length} {t('participants_selected')}
						</span>
					)}
				</div>
			</div>

			<div className="honors-content">
				{Object.keys(groupedParticipants).length === 0 ? (
					<div className="no-data">
						<p>{currentDate === new Date().toLocaleDateString('en-CA') 
							? t('no_participants_today') 
							: t('no_honors_on_date')}</p>
					</div>
				) : (
					<div className="groups-list">
						{Object.values(groupedParticipants).map(renderGroup)}
					</div>
				)}
			</div>

			{/* Award Honors Button */}
			{selectedParticipants.length > 0 && (
				<div className="fixed-bottom">
					<button
						className="award-honors-btn"
						onClick={awardHonors}
					>
						{t('award_honors')} ({selectedParticipants.length})
					</button>
				</div>
			)}
		</div>
	);
};

export default ManageHonors;