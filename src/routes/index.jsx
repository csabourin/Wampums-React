// src/routes/index.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Lazy load pages for better performance
const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const ParentDashboard = React.lazy(() => import('../pages/ParentDashboard'));
const ResetPassword = React.lazy(() => import('../pages/ResetPassword'));
const Admin = React.lazy(() => import('../pages/Admin'));
const ManagePoints = React.lazy(() => import('../pages/ManagePoints'));
const ManageHonors = React.lazy(() => import('../pages/ManageHonors'));
const Attendance = React.lazy(() => import('../pages/Attendance'));
const FormInscription = React.lazy(() => import('../pages/FormInscription'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Protected route component
function ProtectedRoute({ children, requiredRoles = [] }) {
	const { currentUser, isAuthenticated } = useAuth();

	if (!isAuthenticated) {
		// Not logged in
		return <Navigate to="/login" replace />;
	}

	if (requiredRoles.length > 0 && !requiredRoles.includes(currentUser.role)) {
		// User doesn't have the required role
		return <Navigate to={currentUser.role === 'parent' ? '/parent-dashboard' : '/dashboard'} replace />;
	}

	return children;
}

function AppRouter() {
	const { currentUser } = useAuth();

	return (
		<BrowserRouter>
			<React.Suspense fallback={<div>Loading...</div>}>
				<Routes>
					{/* Public routes */}
					<Route 
						path="/login" 
						element={
							currentUser ? 
								<Navigate to={currentUser.role === 'parent' ? '/parent-dashboard' : '/dashboard'} replace /> : 
								<Login />
						} 
					/>
					<Route path="/register" element={<Register />} />
					<Route path="/reset-password" element={<ResetPassword />} />

					{/* Protected routes */}
					<Route 
						path="/dashboard" 
						element={
							<ProtectedRoute requiredRoles={['admin', 'animation']}>
								<Dashboard />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/parent-dashboard" 
						element={
							<ProtectedRoute>
								<ParentDashboard />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/admin" 
						element={
							<ProtectedRoute requiredRoles={['admin']}>
								<Admin />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/manage-points" 
						element={
							<ProtectedRoute requiredRoles={['admin', 'animation']}>
								<ManagePoints />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/manage-honors" 
						element={
							<ProtectedRoute requiredRoles={['admin', 'animation']}>
								<ManageHonors />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/attendance" 
						element={
							<ProtectedRoute requiredRoles={['admin', 'animation']}>
								<Attendance />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/formulaire-inscription" 
						element={
							<ProtectedRoute>
								<FormInscription />
							</ProtectedRoute>
						} 
					/>

					<Route 
						path="/formulaire-inscription/:id" 
						element={
							<ProtectedRoute>
								<FormInscription />
							</ProtectedRoute>
						} 
					/>

					{/* Redirect root to appropriate dashboard */}
					<Route 
						path="/" 
						element={
							currentUser ? 
								<Navigate to={currentUser.role === 'parent' ? '/parent-dashboard' : '/dashboard'} replace /> : 
								<Navigate to="/login" replace />
						} 
					/>

					{/* 404 route */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</React.Suspense>
		</BrowserRouter>
	);
}

export default AppRouter;