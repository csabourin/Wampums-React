// src/pages/ManagePoints.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import { participantService } from '../api/participantService';
import { groupsService } from '../api/groupsService';
import { pointsService } from '../api/pointsService';
import './ManagePoints.css';

const ManagePoints = () => {
	const { t } = useTranslation();
	
	const [participants, setParticipants] = useState([]);
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(true);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [selectedItem, setSelectedItem] = useState(null);
	const [pendingUpdates, setPendingUpdates] = useState([]);
	const [currentSort, setCurrentSort] = useState({ key: 'group', order: 'asc' });
	const [currentFilter, setCurrentFilter] = useState('');
	const [updateTimeout, setUpdateTimeout] = useState(null);

	// Initialize data
	useEffect(() => {
		const initializeData = async () => {
			setLoading(true);
			try {
				// Fetch participants and groups in parallel
				const [participantsResponse, groupsResponse] = await Promise.all([
					participantService.getParticipants(),
					groupsService.getGroups()
				]);

				if (participantsResponse.success && Array.isArray(participantsResponse.participants)) {
					setParticipants(participantsResponse.participants);
				}

				if (groupsResponse.success && Array.isArray(groupsResponse.groups)) {
					setGroups(groupsResponse.groups.sort((a, b) => a.name.localeCompare(b.name)));
				}

			} catch (error) {
				console.error('Error initializing manage points:', error);
				setNotification({
					message: t('error_loading_data'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, [t]);

	// Organize participants by groups with totals
	const organizeParticipants = useCallback(() => {
		if (!participants.length) return { groupedParticipants: {}, unassignedParticipants: [] };

		const grouped = {};
		const unassigned = [];

		// Initialize group data
		groups.forEach(group => {
			grouped[group.id] = {
				...group,
				participants: [],
				total_points: 0
			};
		});

		// Assign participants to groups
		participants.forEach(participant => {
			if (participant.group_id && grouped[participant.group_id]) {
				grouped[participant.group_id].participants.push(participant);
				grouped[participant.group_id].total_points += parseInt(participant.total_points || 0);
			} else {
				unassigned.push(participant);
			}
		});

		// Sort participants within each group
		Object.values(grouped).forEach(group => {
			group.participants.sort((a, b) => {
				if (a.is_leader && !b.is_leader) return -1;
				if (!a.is_leader && b.is_leader) return 1;
				if (a.is_second_leader && !b.is_second_leader) return 1;
				if (!a.is_second_leader && b.is_second_leader) return -1;
				return a.first_name.localeCompare(b.first_name);
			});
		});

		return { groupedParticipants: grouped, unassignedParticipants: unassigned };
	}, [participants, groups]);

	const { groupedParticipants, unassignedParticipants } = organizeParticipants();

	// Handle item selection (participant or group)
	const handleItemClick = (item, type) => {
		if (selectedItem && selectedItem.id === item.id && selectedItem.type === type) {
			setSelectedItem(null);
		} else {
			setSelectedItem({ ...item, type });
		}
	};

	// Handle points update
	const handlePointsChange = async (pointsToAdd) => {
		if (!selectedItem) {
			setNotification({
				message: t('select_participant_or_group'),
				type: 'error'
			});
			return;
		}

		try {
			let updates = [];

			if (selectedItem.type === 'group') {
				// Update all participants in the group
				const group = groupedParticipants[selectedItem.id];
				updates = group.participants.map(participant => ({
					participant_id: participant.id,
					points_change: pointsToAdd,
					reason: `Group ${group.name} points update`
				}));
			} else {
				// Update individual participant
				updates = [{
					participant_id: selectedItem.id,
					points_change: pointsToAdd,
					reason: 'Manual points update'
				}];
			}

			// Add to pending updates
			setPendingUpdates(prev => [...prev, ...updates]);

			// Clear existing timeout
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}

			// Set new timeout to batch updates
			const newTimeout = setTimeout(async () => {
				try {
					await pointsService.updatePoints(pendingUpdates);
					
					// Refresh data
					const participantsResponse = await participantService.getParticipants();
					if (participantsResponse.success) {
						setParticipants(participantsResponse.participants);
					}

					setNotification({
						message: t('points_updated_successfully'),
						type: 'success'
					});

					setPendingUpdates([]);
				} catch (error) {
					console.error('Error updating points:', error);
					setNotification({
						message: t('error_updating_points'),
						type: 'error'
					});
				}
			}, 1000); // Wait 1 second before sending updates

			setUpdateTimeout(newTimeout);

			// Update UI optimistically
			if (selectedItem.type === 'group') {
				const updatedParticipants = participants.map(participant => {
					if (groupedParticipants[selectedItem.id].participants.find(p => p.id === participant.id)) {
						return {
							...participant,
							total_points: parseInt(participant.total_points || 0) + pointsToAdd
						};
					}
					return participant;
				});
				setParticipants(updatedParticipants);
			} else {
				const updatedParticipants = participants.map(participant => {
					if (participant.id === selectedItem.id) {
						return {
							...participant,
							total_points: parseInt(participant.total_points || 0) + pointsToAdd
						};
					}
					return participant;
				});
				setParticipants(updatedParticipants);
			}

		} catch (error) {
			console.error('Error handling points change:', error);
			setNotification({
				message: t('error_updating_points'),
				type: 'error'
			});
		}
	};

	// Sorting functions
	const sortParticipants = (key, order = 'asc') => {
		setCurrentSort({ key, order });
		
		let sortedParticipants = [...participants];
		
		switch (key) {
			case 'name':
				sortedParticipants.sort((a, b) => {
					const result = a.first_name.localeCompare(b.first_name);
					return order === 'asc' ? result : -result;
				});
				break;
			case 'points':
				sortedParticipants.sort((a, b) => {
					const result = (parseInt(a.total_points || 0)) - (parseInt(b.total_points || 0));
					return order === 'asc' ? result : -result;
				});
				break;
			case 'group':
			default:
				// Default group sorting is handled by organizeParticipants
				break;
		}
		
		if (key !== 'group') {
			setParticipants(sortedParticipants);
		}
	};

	// Filter participants by group
	const handleGroupFilter = (groupId) => {
		setCurrentFilter(groupId);
	};

	// Get filtered groups for display
	const getFilteredGroups = () => {
		if (!currentFilter) {
			return Object.values(groupedParticipants).filter(group => group.participants.length > 0);
		}
		const filtered = groupedParticipants[currentFilter];
		return filtered ? [filtered] : [];
	};

	// Render participant row
	const renderParticipant = (participant, isGroupMember = false) => (
		<div
			key={participant.id}
			className={`participant-row ${selectedItem && selectedItem.id === participant.id && selectedItem.type === 'participant' ? 'selected' : ''} ${isGroupMember ? 'group-member' : ''}`}
			onClick={() => handleItemClick(participant, 'participant')}
			data-participant-id={participant.id}
		>
			<span className="participant-name">
				{participant.first_name} {participant.last_name}
				{participant.is_leader && <span className="badge leader">{t('leader')}</span>}
				{participant.is_second_leader && <span className="badge second-leader">{t('second_leader')}</span>}
			</span>
			<span className="participant-points">{participant.total_points || 0} {t('points')}</span>
		</div>
	);

	// Render group section
	const renderGroup = (group) => (
		<div key={group.id} className="group-section">
			<div
				className={`group-header ${selectedItem && selectedItem.id === group.id && selectedItem.type === 'group' ? 'selected' : ''}`}
				onClick={() => handleItemClick(group, 'group')}
				data-group-id={group.id}
			>
				<span className="group-name">{group.name}</span>
				<span className="group-total">{group.total_points} {t('points')}</span>
			</div>
			<div className="group-content">
				{group.participants.map(participant => renderParticipant(participant, true))}
			</div>
		</div>
	);

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="manage-points-page">
			{notification.message && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="page-header">
				<Link to="/dashboard" className="back-link">{t('back_to_dashboard')}</Link>
				<h1>{t('manage_points')}</h1>
			</div>

			<div className="controls">
				<div className="sort-options">
					<button
						className={currentSort.key === 'name' ? 'active' : ''}
						onClick={() => sortParticipants('name', currentSort.key === 'name' && currentSort.order === 'asc' ? 'desc' : 'asc')}
					>
						{t('sort_by_name')}
						{currentSort.key === 'name' && (currentSort.order === 'asc' ? ' ‘' : ' “')}
					</button>
					<button
						className={currentSort.key === 'group' ? 'active' : ''}
						onClick={() => sortParticipants('group')}
					>
						{t('sort_by_group')}
					</button>
					<button
						className={currentSort.key === 'points' ? 'active' : ''}
						onClick={() => sortParticipants('points', currentSort.key === 'points' && currentSort.order === 'asc' ? 'desc' : 'asc')}
					>
						{t('sort_by_points')}
						{currentSort.key === 'points' && (currentSort.order === 'asc' ? ' ‘' : ' “')}
					</button>
				</div>

				<div className="filter-options">
					<label htmlFor="group-filter">{t('filter_by_group')}:</label>
					<select
						id="group-filter"
						value={currentFilter}
						onChange={(e) => handleGroupFilter(e.target.value)}
					>
						<option value="">{t('all_groups')}</option>
						{groups.map(group => (
							<option key={group.id} value={group.id}>{group.name}</option>
						))}
					</select>
				</div>
			</div>

			<div className="points-content">
				{currentSort.key === 'group' ? (
					<div className="groups-list">
						{getFilteredGroups().map(renderGroup)}
						
						{/* Unassigned participants */}
						{!currentFilter && unassignedParticipants.length > 0 && (
							<div className="group-section unassigned">
								<div className="group-header">
									<span className="group-name">{t('unassigned_participants')}</span>
								</div>
								<div className="group-content">
									{unassignedParticipants.map(participant => renderParticipant(participant))}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="participants-list">
						{participants.map(participant => renderParticipant(participant))}
					</div>
				)}
			</div>

			{/* Points Control Buttons */}
			<div className="points-controls fixed-bottom">
				<div className="points-buttons">
					<button
						className="point-btn add"
						onClick={() => handlePointsChange(1)}
						disabled={!selectedItem}
					>
						+1
					</button>
					<button
						className="point-btn add"
						onClick={() => handlePointsChange(3)}
						disabled={!selectedItem}
					>
						+3
					</button>
					<button
						className="point-btn add"
						onClick={() => handlePointsChange(5)}
						disabled={!selectedItem}
					>
						+5
					</button>
					<button
						className="point-btn remove"
						onClick={() => handlePointsChange(-1)}
						disabled={!selectedItem}
					>
						-1
					</button>
					<button
						className="point-btn remove"
						onClick={() => handlePointsChange(-3)}
						disabled={!selectedItem}
					>
						-3
					</button>
					<button
						className="point-btn remove"
						onClick={() => handlePointsChange(-5)}
						disabled={!selectedItem}
					>
						-5
					</button>
				</div>

				{selectedItem && (
					<div className="selected-info">
						{selectedItem.type === 'group' ? (
							<p>{t('selected_group')}: {selectedItem.name}</p>
						) : (
							<p>{t('selected_participant')}: {selectedItem.first_name} {selectedItem.last_name}</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ManagePoints;