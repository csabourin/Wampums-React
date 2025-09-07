// src/pages/Attendance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import { attendanceService } from '../api/attendanceService';
import { participantService } from '../api/participantService';
import { groupsService } from '../api/groupsService';
import './Attendance.css';

const Attendance = () => {
	const { t } = useTranslation();
	
	const [loading, setLoading] = useState(true);
	const [initializing, setInitializing] = useState(true);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
	const [availableDates, setAvailableDates] = useState([]);
	const [participants, setParticipants] = useState([]);
	const [attendanceData, setAttendanceData] = useState({});
	const [guests, setGuests] = useState([]);
	const [groups, setGroups] = useState([]);
	const [selectedParticipant, setSelectedParticipant] = useState(null);
	const [selectedGroup, setSelectedGroup] = useState(null);
	
	// Guest form state
	const [guestName, setGuestName] = useState('');
	const [guestEmail, setGuestEmail] = useState('');

	// Initialize data
	useEffect(() => {
		const initializeData = async () => {
			setLoading(true);
			setInitializing(true);
			try {
				await Promise.all([
					fetchAttendanceDates(),
					preloadAttendanceData()
				]);
			} catch (error) {
				console.error('Error initializing attendance:', error);
				setNotification({
					message: t('error_loading_attendance'),
					type: 'error'
				});
			} finally {
				setLoading(false);
				setInitializing(false);
			}
		};

		initializeData();
	}, [t]);

	// Fetch data when date changes
	useEffect(() => {
		if (!initializing) {
			fetchAttendanceForDate();
		}
	}, [currentDate, initializing]);

	// Fetch available attendance dates
	const fetchAttendanceDates = async () => {
		try {
			const response = await attendanceService.getAttendanceDates();
			if (response.success && response.dates) {
				let dates = [...response.dates];
				
				// Ensure today is in the list
				const today = new Date().toLocaleDateString('en-CA');
				if (!dates.includes(today)) {
					dates.unshift(today);
				}
				
				// Sort dates in descending order
				dates.sort((a, b) => new Date(b) - new Date(a));
				setAvailableDates(dates);
				setCurrentDate(dates[0] || today);
			}
		} catch (error) {
			console.error('Error fetching attendance dates:', error);
			// Set at least today's date
			const today = new Date().toLocaleDateString('en-CA');
			setAvailableDates([today]);
			setCurrentDate(today);
		}
	};

	// Preload attendance data for current date
	const preloadAttendanceData = async () => {
		try {
			await fetchAttendanceForDate();
		} catch (error) {
			console.error('Error preloading attendance data:', error);
		}
	};

	// Fetch attendance data for a specific date
	const fetchAttendanceForDate = async () => {
		if (!currentDate) return;
		
		try {
			const [participantsResponse, attendanceResponse, guestsResponse] = await Promise.all([
				participantService.getParticipants(),
				attendanceService.getAttendance(currentDate),
				attendanceService.getGuestsByDate(currentDate)
			]);

			// Handle participants
			if (participantsResponse.success && Array.isArray(participantsResponse.participants)) {
				setParticipants(participantsResponse.participants);
			}

			// Handle attendance data
			setAttendanceData(attendanceResponse || {});

			// Handle guests
			setGuests(Array.isArray(guestsResponse) ? guestsResponse : []);

			// Organize participants into groups
			organizeParticipantsIntoGroups(participantsResponse.participants || []);

		} catch (error) {
			console.error('Error fetching attendance data:', error);
			setNotification({
				message: t('error_loading_attendance'),
				type: 'error'
			});
		}
	};

	// Organize participants into groups
	const organizeParticipantsIntoGroups = useCallback((participantsList) => {
		const groupsMap = {};
		const participantsWithoutGroup = [];

		participantsList.forEach(participant => {
			if (participant.group_id) {
				if (!groupsMap[participant.group_id]) {
					groupsMap[participant.group_id] = {
						id: participant.group_id,
						name: participant.group_name || 'Unknown Group',
						participants: []
					};
				}
				groupsMap[participant.group_id].participants.push(participant);
			} else {
				participantsWithoutGroup.push(participant);
			}
		});

		// Sort participants within each group
		Object.values(groupsMap).forEach(group => {
			group.participants.sort((a, b) => {
				if (a.is_leader && !b.is_leader) return -1;
				if (!a.is_leader && b.is_leader) return 1;
				if (a.is_second_leader && !b.is_second_leader) return 1;
				if (!a.is_second_leader && b.is_second_leader) return -1;
				return a.first_name.localeCompare(b.first_name);
			});
		});

		// Add unassigned participants as a special group
		if (participantsWithoutGroup.length > 0) {
			groupsMap['unassigned'] = {
				id: 'unassigned',
				name: t('unassigned_participants'),
				participants: participantsWithoutGroup
			};
		}

		// Convert to array and sort by name
		const groupsArray = Object.values(groupsMap).sort((a, b) => {
			if (a.id === 'unassigned') return 1;
			if (b.id === 'unassigned') return -1;
			return a.name.localeCompare(b.name);
		});

		setGroups(groupsArray);
	}, [t]);

	// Handle date change
	const handleDateChange = (newDate) => {
		setCurrentDate(newDate);
		setSelectedParticipant(null);
		setSelectedGroup(null);
	};

	// Handle participant selection
	const handleParticipantClick = (participant) => {
		setSelectedGroup(null);
		setSelectedParticipant(
			selectedParticipant && selectedParticipant.id === participant.id 
				? null 
				: participant
		);
	};

	// Handle group selection
	const handleGroupClick = (group) => {
		setSelectedParticipant(null);
		setSelectedGroup(
			selectedGroup && selectedGroup.id === group.id 
				? null 
				: group
		);
	};

	// Update attendance status
	const updateAttendanceStatus = async (status) => {
		if (!selectedParticipant && !selectedGroup) {
			setNotification({
				message: t('no_selection'),
				type: 'error'
			});
			return;
		}

		try {
			let participantIds = [];
			let previousStatuses = {};

			if (selectedParticipant) {
				participantIds = [selectedParticipant.id];
				previousStatuses[selectedParticipant.id] = attendanceData[selectedParticipant.id] || 'present';
			} else if (selectedGroup) {
				participantIds = selectedGroup.participants.map(p => p.id);
				participantIds.forEach(id => {
					previousStatuses[id] = attendanceData[id] || 'present';
				});
			}

			// Optimistic update
			const newAttendanceData = { ...attendanceData };
			participantIds.forEach(id => {
				newAttendanceData[id] = status;
			});
			setAttendanceData(newAttendanceData);

			// Call API
			const response = await attendanceService.updateAttendance(
				participantIds,
				status,
				currentDate
			);

			if (response.success) {
				setNotification({
					message: selectedGroup 
						? t('group_attendance_updated') 
						: t('attendance_updated'),
					type: 'success'
				});
			} else {
				// Rollback on failure
				const rollbackData = { ...attendanceData };
				participantIds.forEach(id => {
					rollbackData[id] = previousStatuses[id];
				});
				setAttendanceData(rollbackData);
				
				throw new Error(response.message || 'Failed to update attendance');
			}
		} catch (error) {
			console.error('Error updating attendance:', error);
			setNotification({
				message: t('error_updating_attendance'),
				type: 'error'
			});
		}
	};

	// Add guest
	const addGuest = async () => {
		if (!guestName.trim()) {
			setNotification({
				message: t('guest_name_required'),
				type: 'error'
			});
			return;
		}

		try {
			const guestData = {
				name: guestName.trim(),
				email: guestEmail.trim() || null,
				attendance_date: currentDate
			};

			const response = await attendanceService.saveGuest(guestData);

			if (response.success) {
				setGuests(prev => [...prev, guestData]);
				setGuestName('');
				setGuestEmail('');
				setNotification({
					message: t('guest_added_successfully'),
					type: 'success'
				});
			} else {
				throw new Error(response.message || 'Failed to add guest');
			}
		} catch (error) {
			console.error('Error adding guest:', error);
			setNotification({
				message: t('error_adding_guest'),
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

	// Get participant status
	const getParticipantStatus = (participantId) => {
		return attendanceData[participantId] || 'present';
	};

	// Render participant row
	const renderParticipant = (participant) => {
		const status = getParticipantStatus(participant.id);
		const isSelected = selectedParticipant && selectedParticipant.id === participant.id;

		return (
			<div
				key={participant.id}
				className={`participant-row ${isSelected ? 'selected' : ''} ${status}`}
				onClick={() => handleParticipantClick(participant)}
				data-participant-id={participant.id}
			>
				<div className="participant-info">
					<span className="participant-name">
						{participant.first_name} {participant.last_name}
						{participant.is_leader && <span className="badge leader">{t('leader')}</span>}
						{participant.is_second_leader && <span className="badge second-leader">{t('second_leader')}</span>}
					</span>
				</div>
				<span className={`participant-status ${status}`}>
					{t(status)}
				</span>
			</div>
		);
	};

	// Render group section
	const renderGroup = (group) => {
		const isSelected = selectedGroup && selectedGroup.id === group.id;

		return (
			<div key={group.id} className="group-section">
				<div
					className={`group-header ${isSelected ? 'selected' : ''}`}
					onClick={() => handleGroupClick(group)}
					data-group-id={group.id}
				>
					<span className="group-name">{group.name}</span>
					<span className="participant-count">
						{group.participants.length} {t('participants')}
					</span>
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
		<div className="attendance-page">
			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="page-header">
				<Link to="/dashboard" className="back-link">{t('back_to_dashboard')}</Link>
				<h1>{t('attendance')}</h1>
			</div>

			<div className="date-navigation">
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

			<div className="attendance-content">
				<div className="attendance-list">
					{groups.length === 0 ? (
						<div className="no-data">
							<p>{t('no_participants_found')}</p>
						</div>
					) : (
						groups.map(renderGroup)
					)}
				</div>

				{/* Guest Entry Section */}
				<div className="guest-section">
					<h3>{t('add_guest')}</h3>
					<div className="guest-form">
						<input
							type="text"
							placeholder={t('guest_name')}
							value={guestName}
							onChange={(e) => setGuestName(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && addGuest()}
						/>
						<input
							type="email"
							placeholder={t('guest_email_optional')}
							value={guestEmail}
							onChange={(e) => setGuestEmail(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && addGuest()}
						/>
						<button onClick={addGuest} className="add-guest-btn">
							{t('add_guest_button')}
						</button>
					</div>

					{/* Guest List */}
					{guests.length > 0 && (
						<div className="guest-list">
							<h4>{t('guests_for_date')}</h4>
							{guests.map((guest, index) => (
								<div key={index} className="guest-row">
									<span className="guest-name">{guest.name}</span>
									{guest.email && <span className="guest-email">{guest.email}</span>}
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Status Control Buttons */}
			<div className="status-controls fixed-bottom">
				<div className="status-buttons">
					<button
						className="status-btn present"
						onClick={() => updateAttendanceStatus('present')}
						disabled={!selectedParticipant && !selectedGroup}
					>
						{t('present')}
					</button>
					<button
						className="status-btn absent"
						onClick={() => updateAttendanceStatus('absent')}
						disabled={!selectedParticipant && !selectedGroup}
					>
						{t('absent')}
					</button>
					<button
						className="status-btn late"
						onClick={() => updateAttendanceStatus('late')}
						disabled={!selectedParticipant && !selectedGroup}
					>
						{t('late')}
					</button>
					<button
						className="status-btn excused"
						onClick={() => updateAttendanceStatus('excused')}
						disabled={!selectedParticipant && !selectedGroup}
					>
						{t('excused')}
					</button>
				</div>

				{(selectedParticipant || selectedGroup) && (
					<div className="selected-info">
						{selectedParticipant ? (
							<p>{t('selected_participant')}: {selectedParticipant.first_name} {selectedParticipant.last_name}</p>
						) : (
							<p>{t('selected_group')}: {selectedGroup.name} ({selectedGroup.participants.length} {t('participants')})</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default Attendance;