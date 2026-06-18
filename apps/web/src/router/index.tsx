import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';

const Login = React.lazy(() => import('../features/auth/Login'));
const Register = React.lazy(() => import('../features/auth/Register'));
const Dashboard = React.lazy(() => import('../features/dashboard/Dashboard'));
const CreateGroup = React.lazy(() => import('../features/groups/CreateGroup'));
const GroupDetails = React.lazy(() => import('../features/groups/GroupDetails'));
const ProfileSettings = React.lazy(() => import('../features/profile/ProfileSettings'));
const InviteAccept = React.lazy(() => import('../features/groups/InviteAccept'));
const NotFound = React.lazy(() => import('../features/errors/NotFound'));
const Terms = React.lazy(() => import('../features/legal/Terms'));
const Privacy = React.lazy(() => import('../features/legal/Privacy'));

const LoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-sans">
    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
      Loading Monetely...
    </span>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Public Legal Routes */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Public Invite Token Acceptance Route */}
          <Route path="/invite/:token" element={<InviteAccept />} />

          {/* Protected Dashboard/App Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups/new" element={<CreateGroup />} />
              <Route path="/groups/:groupId" element={<GroupDetails />} />
              <Route path="/invites" element={<Navigate to="/profile?tab=invites" replace />} />
              <Route path="/profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
