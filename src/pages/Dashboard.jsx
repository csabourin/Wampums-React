// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Notification from '../components/common/Notification/Notification';
import LanguageToggle from '../components/common/LanguageToggle/LanguageToggle';
import { participantService } from '../api/participantService';
import { organizationService } from '../api/organizationService';
import './Dashboard.css';

const Dashboard = () => {
	const { t } = useTranslation();
	const { currentUser, logout } = useAuth();
	const navigate = useNavigate();

	const [groups, setGroups] = useState([]);
	const [participants, setParticipants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [notification, setNotification] = useState({ message: '', type: '' });
	const [organizationName, setOrganizationName] = useState('Scouts');
	const [organizationLogo, setOrganizationLogo] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				// Fetch participants data
				const participantsResponse = await participantService.getParticipants();
				if (participantsResponse.success && Array.isArray(participantsResponse.participants)) {
					setParticipants(participantsResponse.participants);
				}

				// Organize participants into groups
				const groupsMap = new Map();

				participantsResponse.participants.forEach(participant => {
					if (!participant.group_id) return;

					if (!groupsMap.has(participant.group_id)) {
						groupsMap.set(participant.group_id, {
							id: participant.group_id,
							name: participant.group_name || 'Unknown Group',
							participants: [],
							totalPoints: 0
						});
					}

					const group = groupsMap.get(participant.group_id);
					group.participants.push(participant);
					group.totalPoints += (parseInt(participant.total_points) || 0);
				});

				// Convert map to array and sort by name
				const groupsArray = Array.from(groupsMap.values()).sort((a, b) => 
					a.name.localeCompare(b.name)
				);

				setGroups(groupsArray);

				// Fetch organization settings
				const settings = await organizationService.getOrganizationSettings();
				if (settings && settings.organization_info) {
					setOrganizationName(settings.organization_info.name || 'Scouts');
					setOrganizationLogo(settings.organization_info.logo || '');
				}

			} catch (error) {
				console.error('Error fetching dashboard data:', error);
				setNotification({
					message: t('error_loading_dashboard'),
					type: 'error'
				});
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [t]);

	const handleLogout = async () => {
		try {
			await logout();
			// Redirect will happen automatically via router
		} catch (error) {
			console.error('Logout error:', error);
			setNotification({
				message: t('logout_error'),
				type: 'error'
			});
		}
	};

	// Function to render participants for a specific group
	const renderParticipantsForGroup = (participants) => {
		// Sort participants: leader first, then second leader, then alphabetically by first name
		const sortedParticipants = [...participants].sort((a, b) => {
			// Sort leaders first
			if (a.is_leader && !b.is_leader) return -1;
			if (!a.is_leader && b.is_leader) return 1;

			// Sort second leaders next
			if (a.is_second_leader && !b.is_second_leader) return -1;
			if (!a.is_second_leader && b.is_second_leader) return 1;

			// Alphabetical sort by first name for non-leaders and non-second-leaders
			return a.first_name.localeCompare(b.first_name);
		});

		return sortedParticipants.map(participant => (
			<div 
				key={participant.id}
				className="list-item"
				data-participant-id={participant.id}
				data-group-id={participant.group_id || 'none'}
				data-points={participant.total_points || 0}
			>
				<span className="participant-name">
					{participant.first_name} {participant.last_name}
					{participant.is_leader && <span className="badge leader">{t('leader')}</span>}
					{participant.is_second_leader && <span className="badge second-leader">{t('second_leader')}</span>}
				</span>
				<span className="participant-points" id={`name-points-${participant.id}`}>
					{participant.total_points || 0} {t('points')}
				</span>
			</div>
		));
	};

	// Function to render points list (groups and participants)
	const renderPointsList = () => {
		if (groups.length === 0) {
			return <p className="no-data">{t('no_groups_found')}</p>;
		}

		return (
			<div className="points-list">
				{groups.map(group => (
					<div key={group.id} className="group-section">
						<div 
							className="group-header" 
							data-group-id={group.id}
							data-points={group.totalPoints}
						>
							{group.name} - <span id={`group-points-${group.id}`}>{group.totalPoints} {t('points')}</span>
						</div>
						<div className="group-content visible">
							{renderParticipantsForGroup(group.participants)}
						</div>
					</div>
				))}

				{/* Unassigned participants */}
				{renderUnassignedParticipants()}
			</div>
		);
	};

	// Function to render participants without a group
	const renderUnassignedParticipants = () => {
		const unassignedParticipants = participants.filter(p => !p.group_id);

		if (unassignedParticipants.length === 0) {
			return null;
		}

		return (
			<div className="group-section">
				<div 
					className="group-header" 
					data-group-id="none"
					data-points="0"
				>
					{t('no_group')}
				</div>
				<div className="group-content visible">
					{renderParticipantsForGroup(unassignedParticipants)}
				</div>
			</div>
		);
	};

	if (loading) {
		return <LoadingSpinner fullScreen text={t('loading')} />;
	}

	return (
		<div className="dashboard-page">
			<LanguageToggle />

			{notification.message && (
				<Notification 
					message={notification.message}
					type={notification.type}
					onClose={() => setNotification({ message: '', type: '' })}
				/>
			)}

			<div className="dashboard-header">
				<h1>{t('dashboard_title')}</h1>
				<h2>{organizationName}</h2>
			</div>

			<div className="dashboard-content">
				<div className="manage-items">
					<Link to="/manage-points" className="dashboard-link">{t('manage_points')}</Link>
					<Link to="/manage-honors" className="dashboard-link">{t('manage_honors')}</Link>
					<Link to="/attendance" className="dashboard-link">{t('attendance')}</Link>
					<Link to="/upcoming-meeting" className="dashboard-link">{t('upcoming_meeting')}</Link>
				</div>

				{organizationLogo && (
					<div className="logo-container">
						<img 
							className="logo" 
							src={organizationLogo} 
							alt="Logo"
							loading="eager"
							decoding="async"
						/>
					</div>
				)}

				<div className="manage-items">
					<Link to="/preparation-reunions" className="dashboard-link">{t('preparation_reunions')}</Link>
					<Link to="/manage-participants" className="dashboard-link">{t('manage_names')}</Link>
					<Link to="/manage-groups" className="dashboard-link">{t('manage_groups')}</Link>
					<Link to="/view-participant-documents" className="dashboard-link">{t('view_participant_documents')}</Link>
					<Link to="/approve-badges" className="dashboard-link">{t('approve_badges')}</Link>
					<Link to="/parent-dashboard" className="dashboard-link">{t('vue_parents')}</Link>
					<Link to="/parent-contact-list" className="dashboard-link">{t('parent_contact_list')}</Link>
					<Link to="/manage-users-participants" className="dashboard-link">{t('manage_participants')}</Link>
					<Link to="/mailing-list" className="dashboard-link">{t('mailing_list')}</Link>
					<Link to="/calendars" className="dashboard-link">{t('calendars')}</Link>
					<Link to="/reports" className="dashboard-link">{t('reports')}</Link>
					<Link to="/group-participant-report" className="dashboard-link">{t('feuille_participants')}</Link>

					{currentUser?.role === 'admin' && (
						<Link to="/admin" className="dashboard-link admin-link">{t('administration')}</Link>
					)}
				</div>

				<div id="points-list">
					{renderPointsList()}
				</div>

				<p className="logout-container">
					<button onClick={handleLogout} className="logout-link">{t('logout')}</button>
				</p>
			</div>
		</div>
	);
};

export default Dashboard;