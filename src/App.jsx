import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupAdminPage from './pages/SetupAdminPage';
import DashboardPage from './pages/DashboardPage';
import TimetablePage from './pages/TimetablePage';
import BrowseTimetablePage from './pages/BrowseTimetablePage';
import ImportTimetablePage from './pages/ImportTimetablePage';
import ManageTeachersPage from './pages/ManageTeachersPage';
import AiInsightsPage from './pages/AiInsightsPage';
import AutoOrganiserPage from './pages/AutoOrganiserPage';
import SubstitutesPage from './pages/SubstitutesPage';
import ApiTestPage from './pages/ApiTestPage';
import NotFoundPage from './pages/NotFoundPage';

import AttendancePage from './pages/AttendancePage';
import PlannerPage from './pages/PlannerPage';
import ResourcesPage from './pages/ResourcesPage';
import ClassHubPage from './pages/ClassHubPage';
import SwapsPage from './pages/SwapsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#052A66',
            color: '#FFFFFF',
            borderRadius: '16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 10px 30px rgba(5, 42, 102, 0.25)',
          },
          success: {
            iconTheme: {
              primary: '#C6EBA0',
              secondary: '#0B1B3A',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/setup-admin" element={<SetupAdminPage />} />
        <Route path="/demo" element={<Navigate to="/login" replace />} />

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Student Timetable */}
          <Route
            path="/my-timetable"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <TimetablePage viewType="student" />
              </ProtectedRoute>
            }
          />

          {/* Teacher Schedule */}
          <Route
            path="/my-schedule"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TimetablePage viewType="teacher" />
              </ProtectedRoute>
            }
          />

          {/* Attendance (Student & Teacher) */}
          <Route path="/attendance" element={<AttendancePage />} />

          {/* Student Tasks & Exams Planner */}
          <Route
            path="/planner"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <PlannerPage />
              </ProtectedRoute>
            }
          />

          {/* Class Study Resources */}
          <Route path="/resources" element={<ResourcesPage />} />

          {/* Teacher Class Hub */}
          <Route
            path="/class-hub"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <ClassHubPage />
              </ProtectedRoute>
            }
          />

          {/* Swaps (Teacher & Admin) */}
          <Route
            path="/swaps"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <SwapsPage />
              </ProtectedRoute>
            }
          />

          {/* S1 Notification Centre */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Profile & Settings */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Teacher Absence Report */}
          <Route
            path="/report-absence"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <SubstitutesPage isTeacherMode={true} />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/auto-organiser"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AutoOrganiserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AiInsightsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/substitutes"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SubstitutesPage isTeacherMode={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ImportTimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/browse"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BrowseTimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-teachers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/api-test"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ApiTestPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
